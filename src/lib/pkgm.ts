import path from 'path'
import util from 'util'

import fs from 'fs-extra'
import tmp from 'tmp-promise'
import { v4 as uuidv4 } from 'uuid'

import * as utils from './utils'
import { RH } from './handler/rh'

import { execFile } from 'child_process'
import { Task, TaskOpts } from './task'

const execFileP = util.promisify(execFile)

import { log } from './log'
import { PKGMFlags } from './flag'
import P from 'pino'
import { Err, ErrType } from './err'
import { ExeCompResult, PKGMPaths } from './interfaces'

/**
 * Options for PKGM.
 */
export interface PKGMOpts {
  /**
   * Flags for PKGM.
   */
  flags?: Partial<PKGMFlags>
  /**
   * Loglevel for PKGM.
   */
  logLevel?: P.LevelWithSilent
  /**
   * Path for the logger.
   */
  logPath?: string
  /**
   * Paths for PKGM.
   */
  paths?: Partial<PKGMPaths>
  /**
   * Path to a resourcehacker executable.
   */
  rhBin?: string
}

/**
 * Class representing a PKGM instance.
 */
export class PKGM {
  /**
   *  Flags for PKGM.
   */
  flags: PKGMFlags

  /**
   *  If PKGM was successfully initialized.
   */
  initialized = false

  /**
   *  The main logger instance.
   */
  log: P.Logger

  /**
   *  Loglevel for PKGM.
   */
  logLevel: P.LevelWithSilent

  /**
   *  Paths for PKGM.
   */
  paths: PKGMPaths

  /**
   *  Path to the pkg executable in node_modules.
   */
  pkgBin: string

  /**
   *  Path to a resourcehacker executable.
   */
  rhBin?: string

  /**
   *  If PKGM is running.
   */
  running = false

  /**
   *  Tmp object to act as tmp root.
   */
  tmp: tmp.DirectoryResult

  /**
   * File to make sure to only delete a pkgm generated tmp folder.
   */
  tmpGuard: string

  /**
   *  The PKGMs instances uiid.
   */
  uiid: string

  /**
   * Create a PKGM instance.
   * @param opts - All options relating to a PKGM instance.
   */
  constructor(opts: PKGMOpts = {}) {
    this.uiid = uuidv4()

    this.flags = {
      ...new PKGMFlags(),
      ...opts.flags
    }

    this.logLevel = this.flags.silent ? 'silent' : opts.logLevel || 'info'

    const prettyPrintOpts = {
      translateTime: true,
      ignore: 'time,pid,hostname'
    }

    this.log = log({
      level: this.logLevel,
      prettyPrint: this.flags.prettyPrint ? prettyPrintOpts : false
    })

    // const rootPath = opts.paths?.root || path.join(__dirname, '../../')
    const rootPath = path.join(__dirname, '../../')
    const cachePath = opts.paths?.cache || path.join(rootPath, '.cache')
    const resPath = path.join(rootPath, 'res')
    const pkgCachePath = opts.paths?.pkgCache || path.join(cachePath, 'pkg-cache')
    // const tmpPath = opts.paths?.tmp || ''
    const tmpPath = ''

    this.paths = {
      cache: cachePath,
      pkgCache: pkgCachePath,
      res: resPath,
      root: rootPath,
      tmp: tmpPath
    }

    this.pkgBin = path.join(this.paths.root, 'node_modules/.bin/pkg.cmd')
    this.rhBin = opts.rhBin

    this.tmp = {} as tmp.DirectoryResult
    this.tmpGuard = ''
  }

  /**
   * Cleanup a PKMG instance. Dont use this instance after calling this method.
   * @return Promise<void>
   */
  async cleanup(): Promise<void> {
    this.log.debug('cleanup')

    if (this.flags.keepTMP) {
      this.log.debug('keepTMP flag is set. Skip temp folder cleanup')
      return
    }

    const valid = fs.existsSync(this.tmpGuard)
    if (!valid) {
      const err = new Err(ErrType.TMP_GUARD_CHECK)
      throw err
    }

    this.log.debug('delete ttmp folder')
    await this.tmp.cleanup()
  }

  async compExe(exe: string, dirPath: string, run = true): Promise<ExeCompResult> {
    const compRes = {} as ExeCompResult
    this.log.debug(`compare:\n1: ${exe}\n2: ${dirPath}`)

    const rh = new RH({
      pkgm: this
    })

    await rh.fetch()

    const tmpPath = await utils.getTmpDir(this.paths.tmp)

    if (run) {
      this.log.debug('run exes')
      const output = await execFileP(exe)

      const stdoutBase = await fs.readFile(path.join(dirPath, 'stdout'))
      const stderrBase = await fs.readFile(path.join(dirPath, 'stderr'))

      compRes.run =
        output.stdout === stdoutBase.toString() && output.stderr === stderrBase.toString()
    } else {
      this.log.debug('do not run exes')
      compRes.run = true
    }
    this.log.debug('run: ' + compRes.run)

    await rh.exec({
      open: exe,
      save: path.join(tmpPath, 'dialog.rc'),
      action: 'extract',
      mask: ',,,'
    })

    const compareValues = [
      {
        name: 'icon',
        value: 'ICON1_1.ico',
        base: 'icon.ico'
      },
      {
        name: 'rc',
        value: 'dialog.rc'
      },
      {
        name: 'manifest',
        value: 'MANIFEST1_1.txt',
        base: 'manifest'
      }
    ]

    for (const cV of compareValues) {
      const p1 = path.join(tmpPath, cV.value)
      const p2 = path.join(dirPath, cV.base || cV.value)

      const p1Exists = fs.existsSync(p1)
      const p2Exists = fs.existsSync(p2)

      if (p1Exists && p2Exists) {
        this.log.debug(`exes have: ${cV.name}`)
        compRes[cV.name] = await utils.compareBuf(p1, p2)
      } else {
        compRes[cV.name] = p1Exists === p2Exists
      }

      this.log.debug(`${cV.name}: ${compRes[cV.name]}`)
    }

    compRes.all = compRes.run && compRes.icon && compRes.rc && compRes.manifest

    this.log.debug(`comp result: ${compRes.all}`)

    if (!this.flags.keepTMP) {
      await fs.remove(tmpPath)
    }

    return compRes
  }

  /**
   * Run a PKGM task.
   * @param opts - All options relating to a task.
   * @return Promise<Task>
   */
  async exec(opts: TaskOpts): Promise<Task> {
    this.log.debug('exec task')

    const task = new Task(this, opts)

    await task.run()

    task.log.debug(`end state: ${task.state}`)

    if (task.state === 'error') {
      throw task.error
    }

    return task
  }

  /**
   * Init PKGM.
   * @return Promise<void>
   */
  async init(): Promise<void> {
    this.log.debug('init pkgm')

    // setup paths
    this.tmp = await tmp.dir({
      keep: this.flags.keepTMP,
      prefix: 'pkgm',
      unsafeCleanup: true
    })

    this.paths.tmp = this.tmp.path

    await utils.ensureDirs(Object.values(this.paths))

    // ensure the tmp path is clean
    this.tmpGuard = path.join(this.paths.tmp, `.${this.uiid}`)

    try {
      const fd = await fs.open(this.tmpGuard, 'wx')
      await fs.close(fd)
    } catch (error) {
      this.log.debug(error as Error)
      // todo tmp guard test
      const err = new Err(ErrType.TMP_GUARD_CREATE)
      this.log.error(err)
      throw err
    }

    this.initialized = true
  }
}

/**
 * Helper function to run pkmg without handling the instance yourself
 * @param pkgmOpts PKGM options.
 * @param taskOpts Task options.
 * @return Promise<{pkgm, task}> the pkgm instance and the executed task
 */
export async function exec(
  pkgmOpts: PKGMOpts,
  taskOpts: TaskOpts
): Promise<{ pkgm: PKGM; task: Task }> {
  const pkgm = new PKGM(pkgmOpts)

  await pkgm.init()

  const task = await pkgm.exec(taskOpts)

  return { pkgm, task }
}

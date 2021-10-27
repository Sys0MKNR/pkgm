import path from 'path'
import util from 'util'

import fs from 'fs-extra'
import { need, system as pkgFetchSystem } from 'pkg-fetch'

import del from 'del'

import { PKGM } from './pkgm'
import { RCED } from './handler/rced'
import { RH } from './handler/rh'

import { log } from './log'
import { PKGMFlags } from './flag'
import * as utils from './utils'
import { BaseTarget, HandlerArgs, Metadata, PKGArgs, Target } from './interfaces'
import P from 'pino'
import { Err, ErrType } from './err'
import { execFile } from 'child_process'

const execFileP = util.promisify(execFile)

/** Options for a Task. */
export interface TaskOpts {
  /** Args for the handler. rh or rced */
  args?: HandlerArgs
  /** Flags for a Task. Overwrites PKGM instance flags.*/
  flags?: Partial<PKGMFlags>
  /** Metadata.*/
  metadata?: Metadata
  /** Arguments for pkg.*/
  pkg?: PKGArgs
  /** Targets.*/
  targets?: Array<string>
}

export interface TaskPaths {
  /** Path for the modified node binaries. */
  nodeBin: string
  /** Path to the tasks tmp directory. */
  tmp: string
}
/** Class representing a Task. */
export class Task {
  /** Static task id counter.
   */
  static ID = 0

  /**
   * Args for the handler.
   */
  args?: HandlerArgs

  /**
   * Error object that will be set if error is thrown.
   */
  error?: Error

  /**
   * Flags for the specific task.
   */
  flags: PKGMFlags

  /**
   * Handler used to edit the exe.
   */
  handler: RH | RCED

  /**
   * The task id.
   */
  id: number

  /**
   *  The main logger instance.
   */
  log: P.Logger

  /**
   * Metadata object.
   */
  metadata?: Metadata

  /**
   * The internal name of the task.
   */
  name: string

  /**
   * Paths for the task.
   */
  paths: TaskPaths

  /**
   * Args for pkg.
   */
  pkg?: PKGArgs

  /**
   * The PKGM instance.
   */
  pkgm: PKGM

  /**
   * State of the task */
  state: 'ready' | 'running' | 'finished' | 'error'

  /**
   * Targets of the task */
  targets: Array<Target>

  /**
   * Targets as a string array.
   */
  unparsedTargets: Array<string>

  /**
   * Create a task.
   * @param pkgm - A pkgm instance.
   * @param opts - Options for the task.
   */
  constructor(pkgm: PKGM, opts: TaskOpts) {
    this.id = ++Task.ID
    this.name = `task ${this.id}`
    this.args = opts.args
    this.pkg = opts.pkg
    this.pkgm = pkgm
    this.metadata = opts.metadata
    this.unparsedTargets = opts.targets || ['host']
    this.paths = {} as TaskPaths
    this.state = 'ready'

    this.log = log(this.name)

    this.flags = {
      ...this.pkgm.flags,
      ...opts.flags
    }

    if (this.flags.useRH) {
      this.handler = new RH({
        pkgm: this.pkgm,
        flags: this.flags,
        task: this
      })
    } else {
      this.handler = new RCED({
        pkgm: this.pkgm,
        flags: this.flags,
        task: this
      })
    }

    this.targets = []
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

    if (this.paths.tmp.startsWith(this.pkgm.paths.tmp)) {
      await del(this.paths.tmp, { force: true })
    }
  }

  /**
   * Edit the target node binaries.
   * @return Promise<void>
   */
  async edit(): Promise<void> {
    this.log.debug('edit metadata')

    await this.handler.prepare(this.args, this.metadata)

    for (const target of this.targets) {
      if (target.platform !== 'win') {
        this.log.debug('skip non win target: ' + target.name)
        continue
      }

      this.log.debug('edit target: ' + target.name)

      const pkgTMPPath = this.paths.nodeBin

      const arr = target.fileName.split('-')
      arr[0] = 'built'
      const fixedName = arr.join('-')

      target.tmpPath = path.join(pkgTMPPath, fixedName)

      await fs.copyFile(target.fullPath, target.tmpPath)

      await this.handler.edit(target)
    }
  }

  /**
   * Fetch binaries(handler and node).
   * @return Promise<void>
   */
  async fetchBinaries(): Promise<void> {
    this.log.debug('fetch handler binaries')
    await this.handler.fetch()

    this.log.debug('fetch node base binaries')
    const targets = this.parseTargets(this.unparsedTargets)

    for (const baseTarget of targets) {
      const target = {
        ...baseTarget
      } as Target

      if (target.platform !== 'win') {
        continue
      }

      await need({
        ...baseTarget,
        dryRun: true
      })

      target.fullPath = await need({
        ...baseTarget,
        output: this.pkgm.paths.pkgCache
      })
      target.fileName = path.basename(target.fullPath)

      this.targets.push(target)
    }

    this.log.debug(this.targets)
  }

  /**
   * Check if a task is currently running.
   * @return boolean If the task is currently running.
   */
  isRunning(): boolean {
    return this.state === 'running'
  }

  /**
   * Parse the target string array into target objects.
   * @return Array<BaseTarget>
   */
  parseTargets(targetsS: Array<string>): Array<BaseTarget> {
    // [ 'node6-macos-x64', 'node6-linux-x64' ]
    const {
      hostArch,
      hostPlatform,
      isValidNodeRange,
      knownArchs,
      knownPlatforms,
      toFancyArch,
      toFancyPlatform
    } = pkgFetchSystem

    const hostNodeRange = 'node' + process.versions.node.split('.')[0]

    const targets: Array<BaseTarget> = []
    for (const item of targetsS) {
      const target: BaseTarget = {
        nodeRange: hostNodeRange,
        platform: hostPlatform,
        arch: hostArch,
        originalValue: item,
        name: ''
      }
      if (item !== 'host') {
        for (const token of item.split('-')) {
          if (!token) continue
          if (isValidNodeRange(token)) {
            target.nodeRange = token
            continue
          }
          const p = toFancyPlatform(token)
          if (knownPlatforms.indexOf(p) >= 0) {
            target.platform = p
            continue
          }
          const a = toFancyArch(token)
          if (knownArchs.indexOf(a) >= 0) {
            target.arch = a
            continue
          }
          throw new Err(ErrType.INVALID_TARGET, item)
        }
      }
      target.name = [target.nodeRange, target.platform, target.arch].join('-')
      targets.push(target)
    }
    return targets
  }

  /**
   * Run a task.
   * @return Promise<void>
   */
  async run(): Promise<void> {
    this.log.debug('run: ' + this.unparsedTargets.join(' | '))

    try {
      this.paths.tmp = await utils.getTmpDir(this.pkgm.paths.tmp)
      this.paths.nodeBin = path.join(this.paths.tmp, 'node')
      await utils.ensureDirs(Object.values(this.paths))

      this.state = 'running'

      await this.fetchBinaries()

      await this.edit()

      await this.runPKG()
      await this.cleanup()

      this.state = 'finished'
    } catch (error) {
      this.log.error((error as Error).message)
      await this.cleanup()
      this.state = 'error'
      this.error = error as Error
    }
  }

  /**
   * Run pkg.
   * @return Promise<void>
   */
  async runPKG(): Promise<void> {
    if (!this.pkg) {
      this.log.debug('skip pkg step')
      return
    }

    this.log.debug('run pkg')

    let args: Array<string>

    if (!Array.isArray(this.pkg)) {
      this.log.debug('no args specified')

      if (!this.pkg.src) {
        // this.log.error('no src specified')
        throw new Err(ErrType.PKG_MISSING_SRC)
      }

      if (!this.pkg.out && !this.pkg.outDir) {
        // this.log.error('no src and no out path specified')
        throw new Err(ErrType.PKG_MISSING_OUT)
      }

      const outPutType = this.pkg.out ? '--output' : '--out-path'
      const outPath = this.pkg.out || this.pkg.outDir || '.'

      args = [
        '--build',
        this.pkg.src,
        '--target',
        this.unparsedTargets.join(','),
        outPutType,
        outPath
      ]
    } else {
      args = this.pkg
    }

    const env = {
      env: {
        PKG_CACHE_PATH: this.paths.nodeBin,
        PKG_IGNORE_TAG: true
      } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */
    }

    this.log.debug(args)
    this.log.debug(env)

    const res = await execFileP(this.pkgm.pkgBin, args, env)

    this.log.debug(res)
  }
}

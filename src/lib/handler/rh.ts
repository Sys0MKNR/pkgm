import path from 'path'
import util from 'util'
import crypto from 'crypto'
import { execFile } from 'child_process'

import fetch from 'node-fetch'
import fs from 'fs-extra'
import unzipper from 'unzipper'
import del from 'del'
import getStream from 'get-stream'

const calcHash = crypto.createHash('sha256')
const execFileP = util.promisify(execFile)

import * as utils from '../utils'

const RH_ZIP_HASH =
  'efbfbd58efbfbdefbfbd29efbfbdefbfbd6befbfbdefbfbdefbfbd3aefbfbd572a68544c2befbfbdefbfbd056538efbfbd0a58075cefbfbdefbfbdefbfbd'

import { Handler, HandlerOpts } from './handler'
import { ExecResult, Metadata, Target } from '../interfaces'
import { Err, ErrType } from '../err'

/** Options for the RH handler. */
export interface RHOpts extends HandlerOpts {
  /** Path to a resourcehacker executable. */
  bin?: string
}
/**
 * Class representing a resourcehacker(RH) handler instance.
 */
export class RH extends Handler {
  /** Path to the resourcehacker executable. */
  bin?: string
  /** Icon for the executable. */
  icon?: string
  /** Resfile to add to the executable. */
  resFile?: string

  constructor(opts: RHOpts) {
    super(opts)

    this.bin = this.pkgm.rhBin
  }

  /**
   * Edit the binary.
   * @param target
   * @return Promise<void>
   */
  async edit(target: Target): Promise<void> {
    if (this.resFile) {
      await this.exec({
        open: target.tmpPath,
        save: target.tmpPath,
        action: 'addoverwrite',
        resource: this.resFile
      })
    }

    if (this.icon) {
      await this.exec({
        open: target.tmpPath,
        save: target.tmpPath,
        action: 'addoverwrite',
        resource: this.icon,
        mask: 'ICONGROUP,1,'
      })
    }
  }

  /**
   * Run resourcehacker.
   * @param opts - Key value pairs for the rh exec command
   * @return Promise<ExecResult>
   */
  async exec(opts: Record<string, string>): Promise<ExecResult> {
    if (!this.bin) {
      throw new Error('no rh bin set')
    }

    const possibleOpts = ['open', 'action', 'save', 'resource', 'mask']

    const args: Array<string> = []

    possibleOpts.forEach((o) => {
      if (opts[o]) {
        args.push('-' + o)
        args.push(opts[o])
      }
    })

    return execFileP(this.bin, args)
  }

  /**
   * Fetch the resourcehacker executable
   * if no custom bin is set or the exe is available from cache.
   * @return Promise<void>
   */
  async fetch(): Promise<void> {
    this.log.debug('fetch rh')

    if (this.bin) {
      this.bin = path.resolve(this.bin)
      this.log.debug('rh bin path set by user to ' + this.bin)
      return
    }

    const dirPath = path.join(this.pkgm.paths.cache, 'rh')
    const zipPath = path.join(dirPath, 'rh.zip')
    const bin = path.join(dirPath, 'ResourceHacker.exe')

    if (fs.existsSync(bin)) {
      // TODO make hash check
      this.bin = bin
      this.log.debug('use rh bin from  ' + this.bin)
      return
    }

    this.log.debug('fetch rh from online')

    await del(dirPath)
    await fs.ensureDir(dirPath)

    const res = await fetch('http://www.angusj.com/resourcehacker/resource_hacker.zip')
    const zipOut = fs.createWriteStream(zipPath)

    if (!res.body) {
      throw new Err(ErrType.RH_CANNOT_FETCH)
    }

    res.body.pipe(zipOut)

    let hash = await getStream(res.body.pipe(calcHash))
    hash = Buffer.from(hash).toString('hex')

    await utils.waitOnStreamEnd(zipOut)

    if (hash !== RH_ZIP_HASH) {
      throw new Error('rh sh256 hash not correct')
    }

    const zipIn = fs.createReadStream(zipPath)
    const exeOut = unzipper.Extract({
      path: dirPath
    })
    zipIn.pipe(exeOut)
    await utils.waitOnStreamEnd(exeOut)

    this.bin = bin
  }

  /**
   * Generate the final rcdata for res file generation.
   * @param metaData
   * @param rcData
   * @return Partial<RCData>
   */
  generateRCData(metaData: Partial<Metadata> = {}, rcData?: Partial<RCData>): Partial<RCData> {
    this.log.debug('generate RC data')

    if (rcData) {
      return rcData
    }

    const exeName = metaData.name + '.exe'

    const customData: Partial<RCData> = {
      FileDescription: metaData.description,
      FileVersion: metaData.version,
      InternalName: exeName,
      LegalCopyright: metaData.legal,
      OriginalFilename: exeName,
      ProductName: metaData.name,
      ProductVersion: metaData.version
    }

    return customData
  }

  /**
   * Generate a res file from a RHArgs or Metadata objects.
   * @param args
   * @param metaData
   * @return Promise<string>
   */
  async generateRES(args: RHArgs = {}, metaData?: Metadata): Promise<string> {
    let { resFile, rcFile } = args

    const { rcData } = args

    this.log.debug(args)

    if (resFile) {
      return path.resolve(resFile)
    }

    this.log.debug('generate res file...')

    const tmpDirName = await utils.getTmpDir(this.pkgm.paths.tmp)

    resFile = path.join(tmpDirName, 'bin.res')

    if (!rcFile) {
      rcFile = path.join(tmpDirName, 'bin.rc')

      const finalRCDAta: Partial<RCData> = this.generateRCData(metaData, rcData)

      const rcSample = (await fs.readFile(path.join(this.pkgm.paths.res, 'q_sample.rc'))).toString()

      let rc = rcSample

      if (finalRCDAta.FileVersion) {
        rc = rc.replace('#fileVersion#', toCommaVersion(finalRCDAta.FileVersion))
      }

      if (finalRCDAta.ProductVersion) {
        rc = rc.replace('#productVersion#', toCommaVersion(finalRCDAta.ProductVersion))
      }

      let block = ''

      for (const [key, value] of Object.entries(finalRCDAta)) {
        if (value) {
          block += `\t\tVALUE "${key}", "${value}"\n`
        }
      }

      rc = rc.replace('#fileInfoBlock#', block)

      await fs.writeFile(rcFile, rc)
    }

    await this.exec({
      open: rcFile,
      save: resFile,
      action: 'compile'
    })

    return resFile
  }

  /**
   * Prepare the data.
   * @param args
   * @param metaData
   * @return Promise<void>
   */
  async prepare(args?: RHArgs, metaData?: Metadata): Promise<void> {
    if (args) {
      this.icon = args.icon
    } else {
      this.icon = metaData?.icon
    }

    this.resFile = await this.generateRES(args, metaData)
  }
}
/**
 * Convert from dot seperated to comma seperated version.
 * @param version
 * @return string
 */
function toCommaVersion(version: string): string {
  const versionRegex = /([0-9].){3}[0-9]'/

  if (versionRegex.test(version)) {
    version = version.replace(/\./g, ',')
  } else {
    version = version.split('-')[0].split('.').join(',') + ',0'
  }

  return version
}

export interface RCData {
  [key: string]: string
  FileDescription: string
  FileVersion: string
  InternalName: string
  LegalCopyright: string
  OriginalFilename: string
  ProductName: string
  ProductVersion: string
}

/** Args for rh. */
export interface RHArgs {
  /** Icon for the executable. */
  icon?: string
  /** Rc data object. */
  rcData?: Partial<RCData>
  /** Rc file. */
  rcFile?: string
  /** Resource file. */
  resFile?: string
}

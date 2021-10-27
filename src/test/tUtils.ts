import path from 'path'

import tmp from 'tmp-promise'
import deepmerge from 'deepmerge'

import { PKGM, PKGMOpts, TaskOpts } from '..'
import fs from 'fs-extra'

// const ROOT_PATH = path.join(__dirname, '../../')

const TEST_RES_PATH = path.join(__dirname, 'res')

const OVERWRITE_MERGE = (dest: Array<unknown>, src: Array<unknown>) => src

export function getTestResPath(): string {
  return TEST_RES_PATH
}

export async function getTestTMPDir(): Promise<tmp.DirectoryResult> {
  return await tmp.dir({
    unsafeCleanup: true,
    prefix: 'pkgm-test'
  })
}

export async function getAndInitPKGM(opts: PKGMOpts, clean = false): Promise<PKGM> {
  const baseOpts = clean ? undefined : await getBaseOpts(opts)

  const pkgm = new PKGM(baseOpts)

  await pkgm.init()

  return pkgm
}

export async function getBaseOpts(opts: PKGMOpts = {}): Promise<PKGMOpts> {
  // const tmpDir = await getTestTMPDir()

  const baseOpts: PKGMOpts = {
    logLevel: 'info',
    paths: {
      // tmp: tmpDir.path
    },
    flags: {
      keepTMP: true,
      silent: true
    }
  }

  return deepmerge(baseOpts, opts, { arrayMerge: OVERWRITE_MERGE })
}

export function getTaskBaseOpts(opts: TaskOpts = {}): TaskOpts {
  const baseOpts: TaskOpts = {
    targets: ['node14-win-x64'],
    metadata: {
      version: '1.1.11',
      name: 'test',
      description: 'this is a custom test desc',
      legal: 'copyright test',
      icon: path.join(__dirname, './res/icon.ico')
    },
    pkg: {
      src: path.join(__dirname, './res/pkgTest.js')
    }
  }

  return deepmerge(baseOpts, opts, { arrayMerge: OVERWRITE_MERGE })
}

export async function checkExe(
  exe: string,
  resPath: string,
  pkgm: PKGM,
  run = true
): Promise<void> {
  const res = await pkgm.compExe(exe, resPath, run)

  expect(res.run).toBeTruthy()
  expect(res.icon).toBeTruthy()
  expect(res.rc).toBeTruthy()
  expect(res.manifest).toBeTruthy()
  expect(res.all).toBeTruthy()
}

export async function cleanupWithCheck(pkgm: PKGM): Promise<void> {
  await pkgm.cleanup()
  const tmpExists = fs.existsSync(pkgm.paths.tmp)
  expect(tmpExists).toBeFalsy()
}

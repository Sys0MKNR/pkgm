import path from 'path'

import { PKGM, PKGMOpts, TaskOpts } from '..'
import { getTaskBaseOpts, getAndInitPKGM, checkExe, getTestResPath } from './tUtils'

let pkgm: PKGM

describe('basic', () => {
  beforeAll(async () => {
    const baseOpts: PKGMOpts = {
      logLevel: 'debug',
      flags: {
        // keepTMP: true,
        // useRH: true,
        // silent: false
      }
    }

    pkgm = await getAndInitPKGM(baseOpts)
  })

  afterAll(async () => {
    // cleanupWithCheck(pkgm)
  })

  test('rh', async () => {
    const exePath = path.join(pkgm.paths.tmp, '.dist/test-rh.exe')

    const opts = {
      flags: {
        useRH: true
      },
      pkg: {
        out: exePath
      }
    } as TaskOpts

    await pkgm.exec(getTaskBaseOpts(opts))

    // console.log(pkgm)

    await checkExe(exePath, path.join(getTestResPath(), 'rh'), pkgm)
  }, 360000)

  test('rced', async () => {
    const exePath = path.join(pkgm.paths.tmp, '.dist/test-rced.exe')

    const opts = {
      flags: {
        useRH: false
      },
      pkg: {
        out: exePath
      }
    }

    await pkgm.exec(getTaskBaseOpts(opts))

    // console.log(pkgm)
    await checkExe(exePath, path.join(getTestResPath(), 'rced'), pkgm)
  }, 360000)
})

import { PKGM, PKGMOpts, TaskOpts } from '..'

import { getTaskBaseOpts, getAndInitPKGM } from './tUtils'

let pkgm: PKGM

describe('fail', () => {
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
    // await tmpDir.cleanup()
  })

  test('target not possible with', async () => {
    const opts: TaskOpts = {
      targets: ['node16.10']
    }

    await expect(pkgm.exec(getTaskBaseOpts(opts))).rejects.toBeTruthy()
  })

  // test('tmp guard', async () => {
  //   const opts = {
  //     flags: {
  //       useRH: true,
  //       throwTaskError: false
  //     }
  //   } as TaskOpts

  //   const task = await pkgm.exec(deepmerge(baseOpts, opts))

  //   expect(task.error).toBeDefined()

  //   // console.log(pkgm)
  // })
})

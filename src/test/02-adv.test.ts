import path from 'path'

import { PKGM, PKGMOpts, TaskOpts } from '..'
import { getTaskBaseOpts, getAndInitPKGM, checkExe, getTestResPath } from './tUtils'

let pkgm: PKGM

describe('adv', () => {
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
    await pkgm.cleanup()
  })

  test('rced | multiple targets', async () => {
    // const exePath = path.join(pkgm.paths.tmp, '.dist/1')

    const opts: TaskOpts = {
      targets: ['node14-win-x64', 'host', 'node16'],
      flags: {
        // useRH: false
      },
      pkg: undefined
    }
    const task = await pkgm.exec(getTaskBaseOpts(opts))

    task.targets.map((t) => checkExe(t.tmpPath, path.join(getTestResPath(), 'rced'), pkgm, false))
  }, 360000)

  test('rced | parralel tasks', async () => {
    const opts1: TaskOpts = {
      targets: ['node10-win-x64'],
      flags: {},
      pkg: undefined
    }

    const opts2: TaskOpts = {
      targets: ['node12-win-x64'],
      flags: {},
      pkg: undefined
    }

    const opts3: TaskOpts = {
      targets: ['node16-win-x64'],
      flags: {},
      pkg: undefined
    }

    const tasks = await Promise.all([
      pkgm.exec(getTaskBaseOpts(opts1)),
      pkgm.exec(getTaskBaseOpts(opts2)),
      pkgm.exec(getTaskBaseOpts(opts3))
    ])

    const p = tasks.map((task) =>
      task.targets.map((t) => checkExe(t.tmpPath, path.join(getTestResPath(), 'rced'), pkgm, false))
    )
    await Promise.all(p.flat())
  }, 360000)
})

import { cleanupWithCheck, getAndInitPKGM } from './tUtils'

describe('min', () => {
  test('basic', async () => {
    const pkgm = await getAndInitPKGM({}, true)

    expect(pkgm.initialized).toBeTruthy()
    expect(pkgm.running).toBeFalsy()
    expect(pkgm.flags).toEqual({
      keepTMP: false,
      logToFile: false,
      prettyPrint: true,
      skipHashChecks: false,
      useRH: false,
      silent: false
    })

    expect(pkgm.initialized).toBe(true)
    expect(pkgm.log).toBeDefined()
    expect(pkgm.logLevel).toBe('info')
    expect(pkgm.paths).toBeDefined()
    expect(pkgm.pkgBin).toBeDefined()
    expect(pkgm.rhBin).toBeUndefined()
    expect(pkgm.running).toBe(false)
    expect(pkgm.tmp).toBeDefined()
    expect(pkgm.tmpGuard).toBeDefined()

    cleanupWithCheck(pkgm)

    // console.log(pkgm)
  })
})

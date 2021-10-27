/**
 * All the possible flags for PKGM.
 */
export class PKGMFlags {
  /**
   * Don't delete tmp files and folder.
   */
  keepTMP = false

  /**
   * Log to file instead of to the console.
   */
  logToFile = false

  /**
   * Pretty print the log output.
   */
  prettyPrint = true

  /**
   * Silent mode. Don't provide any log output.
   */
  silent = false

  /**
   * Pretty print the log output.
   */
  skipHashChecks = false

  /**
   * Use resourcehacker(RH). Otherwise rcedit is used.
   */
  useRH = false
}

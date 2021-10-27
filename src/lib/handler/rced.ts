import rcedit from 'rcedit'
import { Metadata, Target } from '../interfaces'
import { Handler, HandlerOpts } from './handler'

// export interface RCEDOpts{
//   /** PKGM instance. */
//   flags: PKGMFlags
//   /** PKGM instance. */
//   pkgm: PKGM
// }

/**
 * Class representing a rcedit(RCED) handler instance.
 */
export class RCED extends Handler {
  /** Icon for the executable. */
  icon?: string
  /** Arguments for rcedit. */
  rceditArgs?: rcedit.Options

  constructor(opts: HandlerOpts) {
    super(opts)
  }

  /**
   * Edit the binary.
   * @param target
   * @return Promise<void>
   */
  async edit(target: Target): Promise<void> {
    if (this.rceditArgs) {
      this.rceditArgs.icon = this.icon

      await rcedit(target.tmpPath, this.rceditArgs)
    }
  }

  /**
   * Fetch the resourcehacker executable if no custom bin is set
   * or exe is available from cache.
   * @return Promise<void>
   */
  async fetch(): Promise<void> {
    return
  }

  generateData(args?: RCEDArgs, metadata?: Metadata): rcedit.Options {
    if (args) {
      return args
    }

    const exeName = metadata?.name + '.exe'

    const data: Partial<rcedit.Options> = {
      'file-version': metadata?.version,
      'product-version': metadata?.version,
      'version-string': {
        CompanyName: metadata?.name,
        FileDescription: metadata?.description,
        LegalCopyright: metadata?.legal,
        ProductName: exeName
      },
      icon: this.icon
    }

    return data
  }

  /**
   * Prepare the data.
   * @param args
   * @param metaData
   * @return Promise<void>
   */
  async prepare(args?: RCEDArgs, metaData?: Metadata): Promise<void> {
    if (args) {
      this.icon = args.icon
    } else {
      this.icon = metaData?.icon
    }

    this.rceditArgs = this.generateData(args, metaData)
  }
}

export type RCEDArgs = rcedit.Options

// export interface RCEDArgs {
//   icon?: string
//   rceditArgs?: rcedit.Options
// }

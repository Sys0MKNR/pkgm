import P from 'pino'
import { PKGMFlags } from '../flag'
import { Metadata, Target } from '../interfaces'
import { log } from '../log'
import { PKGM } from '../pkgm'
import { Task } from '../task'

export interface HandlerOpts {
  /** PKGM flags. */
  flags?: PKGMFlags
  /** PKGM instance. */
  pkgm: PKGM
  /** Task instance. */
  task?: Task
}

export abstract class Handler {
  /** PKGM instance. */
  flags: PKGMFlags

  /**
   *  The main logger instance.
   */
  log: P.Logger

  /** PKGM instance. */
  pkgm: PKGM

  constructor(opts: HandlerOpts) {
    const { flags, pkgm, task } = opts

    this.log = task?.log || log()

    this.pkgm = pkgm

    this.flags = {
      ...this.pkgm.flags,
      ...flags
    }
  }

  abstract edit(target: Target): Promise<void>
  abstract fetch(): Promise<void>
  abstract prepare(args?: unknown, metaData?: Metadata): Promise<void>
}

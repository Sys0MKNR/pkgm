import { RCEDArgs, RHArgs } from '..'

/** Paths for pkgm. */
export interface PKGMPaths {
  /**
   * Cache path.
   */
  cache: string

  /**
   * Cache path for node binaries.
   */
  pkgCache: string

  /**
   * Path to some standard resources.
   */
  res: string

  /**
   * Root path for all paths. Won't be used for explicitly set paths
   */
  root: string

  /**
   * Tmp path.
   */
  tmp: string
}

/** Args for running pkg. */
export type PKGArgs = Array<string> | SimplePKGArgs

/** Simple args for running pkg. */
export interface SimplePKGArgs {
  /** Out file for pkg. */
  out?: string
  /** Out directory for pkg. */
  outDir?: string
  /** Src path for pkg. */
  src?: string
}

export interface BaseTarget {
  arch: string
  name: string
  nodeRange: string
  originalValue: string
  platform: string
}

export interface Target extends BaseTarget {
  fileName: string
  fullPath: string
  tmpPath: string
  version: string
}

/** Simple metadata object used for editing the binary. */
export interface Metadata {
  description?: string
  icon?: string
  legal?: string
  name?: string
  version?: string
}

export class FullExeCompResult {
  all: Array<boolean> = []
  icon: Array<boolean> = []
  manifest: Array<boolean> = []
  rc: Array<boolean> = []
  run: Array<boolean> = []
}

export class ExeCompResult {
  [key: string]: boolean
  all = true
  icon = true
  manifest = true
  rc = true
  run = true
}

// export class ExeCompResult {
//   basic: BasicExeCompResult = new BasicExeCompResult()
//   full: FullExeCompResult = new FullExeCompResult()
// }

export type HandlerArgs = RHArgs | RCEDArgs

export type ExecResult = { stderr: string; stdout: string }

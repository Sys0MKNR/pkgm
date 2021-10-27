import path from 'path'

import fs from 'fs-extra'
import tmp from 'tmp-promise'

import type stream from 'stream'

export async function waitOnStreamEnd(s: stream): Promise<unknown> {
  return new Promise((resolve) => s.on('finish', resolve))
}

export async function ensureDirs(dirs: Array<string>): Promise<Array<void>> {
  const tasks = dirs.filter((dir) => typeof dir === 'string').map((dir) => fs.ensureDir(dir))
  return Promise.all(tasks)
}

export function removeNullProperties(obj: Record<string, string>): Record<string, unknown> {
  Object.keys(obj)
    .filter((k) => obj[k] == null)
    .forEach((k) => delete obj[k])
  return obj
}

export function safePathResolve(p: string): string | undefined {
  return typeof p === 'string' ? path.resolve(p) : undefined
}

export function getKeys(obj: Record<number, unknown>): Array<number> {
  const fn = Object.keys as <T extends Record<number, unknown>>(obj: T) => Array<keyof T>
  return fn(obj)
}

export async function getTmpDirName(p?: string): Promise<string> {
  let dirName = await tmp.tmpName()
  dirName = path.basename(dirName)

  if (p) {
    dirName = path.join(p, dirName)
  }

  return dirName
}

export async function getTmpDir(p: string): Promise<string> {
  const dirName = await getTmpDirName(p)
  await fs.ensureDir(dirName)

  return dirName
}

export async function compareBuf(p1: string, p2: string): Promise<boolean> {
  const buf1 = await fs.readFile(p1)
  const buf2 = await fs.readFile(p2)

  return Buffer.compare(buf1, buf2) === 0
}

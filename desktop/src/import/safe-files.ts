import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import { lstat, open, readlink, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { importPath } from '../../../src/shared/conductor-import-values.ts'
import { LocalImportError } from './types.ts'

export const FILE_LIMIT_BYTES = 104_857_600
export const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const fileIdentity = (stat: BigIntStats) =>
  [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].join(
    ':',
  )
export const missing = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

async function ancestors(path: string) {
  const result = new Map<string, string>()
  for (let parent = dirname(path); ; parent = dirname(parent)) {
    const stat = await lstat(parent, { bigint: true })
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new LocalImportError('source_changed')
    result.set(parent, `${stat.dev}:${stat.ino}`)
    if (dirname(parent) === parent) return result
  }
}

async function unchangedAncestors(before: Map<string, string>) {
  for (const [path, identity] of before) {
    const stat = await lstat(path, { bigint: true })
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      `${stat.dev}:${stat.ino}` !== identity
    )
      throw new LocalImportError('source_changed')
  }
}

/** Check the opened inode, its metadata, and every directory before and after reading. */
export async function readSourceFile(
  path: string,
  signal: AbortSignal,
  destination?: string,
  expected?: string,
): Promise<{ hash: string; size: number; identity: string }> {
  signal.throwIfAborted()
  const parents = await ancestors(path)
  const before = await lstat(path, { bigint: true })
  if (!before.isFile() || (expected && fileIdentity(before) !== expected))
    throw new LocalImportError('source_changed')
  const source = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  const target = destination
    ? await open(
        destination,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
        0o600,
      )
    : undefined
  const hash = createHash('sha256')
  let size = 0
  try {
    if (
      fileIdentity(await source.stat({ bigint: true })) !== fileIdentity(before)
    )
      throw new LocalImportError('source_changed')
    await unchangedAncestors(parents)
    for await (const chunk of source.createReadStream({
      autoClose: false,
      highWaterMark: 128 * 1024,
    })) {
      signal.throwIfAborted()
      hash.update(chunk)
      size += chunk.length
      if (target) await target.writeFile(chunk)
    }
    if (
      fileIdentity(await source.stat({ bigint: true })) !==
        fileIdentity(before) ||
      fileIdentity(await lstat(path, { bigint: true })) !== fileIdentity(before)
    )
      throw new LocalImportError('source_changed')
    await unchangedAncestors(parents)
    return { hash: hash.digest('hex'), size, identity: fileIdentity(before) }
  } finally {
    await source.close()
    await target?.close()
  }
}

export async function readSourceLink(path: string): Promise<string> {
  const parents = await ancestors(path)
  const before = await lstat(path, { bigint: true })
  if (!before.isSymbolicLink()) throw new LocalImportError('source_changed')
  const value = await readlink(path)
  if (
    fileIdentity(before) !== fileIdentity(await lstat(path, { bigint: true }))
  )
    throw new LocalImportError('source_changed')
  await unchangedAncestors(parents)
  return value
}

export function sourcePath(root: string, path: string): string {
  importPath(path)
  const result = resolve(root, path)
  const rel = relative(root, result)
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`))
    throw new LocalImportError('read_failed')
  return result
}

export async function sourceRoot(path: string): Promise<string> {
  const canonical = await realpath(path)
  const stat = await lstat(canonical)
  if (!stat.isDirectory()) throw new LocalImportError('source_missing')
  return canonical
}

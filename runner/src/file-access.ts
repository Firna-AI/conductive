import { constants } from 'node:fs'
import { open, readlink, realpath, type FileHandle } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

import { isFilePath } from '../../src/shared/file-path'
import type { FileResponse } from '../../src/shared/files'
import type { RunnerFileError } from '../../src/shared/runner-files'
import { decodeUtf8 } from '../../src/shared/utf8'

export class FileAccessError extends Error {
  readonly detail: RunnerFileError
  constructor(detail: RunnerFileError) {
    super(detail.message)
    this.detail = detail
  }
}

export function unavailable(): FileAccessError {
  return new FileAccessError({
    code: 'file_unavailable',
    message: 'The file cannot be read.',
  })
}

export function safePath(path: string): void {
  if (!isFilePath(path) || path.split('/').includes('.git')) throw unavailable()
}

function inside(root: string, target: string): boolean {
  const path = relative(root, target)
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

function mediaType(path: string): string {
  if (/\.md$/i.test(path)) return 'text/markdown'
  if (/\.json$/i.test(path)) return 'application/json'
  if (/\.png$/i.test(path)) return 'image/png'
  if (/\.jpe?g$/i.test(path)) return 'image/jpeg'
  if (/\.svg$/i.test(path)) return 'image/svg+xml'
  return 'text/plain'
}

export function textContent(bytes: Buffer): string | null {
  if (bytes.includes(0)) return null
  return decodeUtf8(bytes)
}

/** Verify the opened descriptor too, so a moved parent cannot escape the root. */
export async function withReadFile<T>(
  root: string,
  path: string,
  read: (file: FileHandle, size: number) => Promise<T>,
): Promise<T> {
  safePath(path)
  try {
    const canonicalRoot = await realpath(root)
    const target = await realpath(resolve(root, path))
    if (
      !inside(canonicalRoot, target) ||
      relative(canonicalRoot, target).split(sep).includes('.git')
    )
      throw unavailable()
    const file = await open(
      target,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    )
    try {
      const openedPath = await realpath(`/proc/self/fd/${file.fd}`)
      if (
        !inside(canonicalRoot, openedPath) ||
        relative(canonicalRoot, openedPath).split(sep).includes('.git')
      )
        throw unavailable()
      const info = await file.stat()
      if (!info.isFile()) throw unavailable()
      return await read(file, info.size)
    } finally {
      await file.close()
    }
  } catch (error) {
    if (error instanceof FileAccessError) throw error
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      throw new FileAccessError({
        code: 'file_not_found',
        message: 'The file does not exist.',
      })
    throw unavailable()
  }
}

export async function readBytes(
  root: string,
  path: string,
  maxBytes: number,
): Promise<Buffer> {
  return withReadFile(root, path, async (file, size) => {
    if (size > maxBytes)
      throw new FileAccessError({
        code: 'file_too_large',
        message: 'The file exceeds the read limit.',
        sizeBytes: size,
        limitBytes: maxBytes,
      })
    const bytes = Buffer.alloc(size + 1)
    let length = 0
    while (length < bytes.length) {
      const result = await file.read(bytes, length, bytes.length - length, null)
      if (result.bytesRead === 0) break
      length += result.bytesRead
    }
    if (length > maxBytes)
      throw new FileAccessError({
        code: 'file_too_large',
        message: 'The file exceeds the read limit.',
        sizeBytes: length,
        limitBytes: maxBytes,
      })
    if (length > size) throw unavailable()
    return bytes.subarray(0, length)
  })
}

/** Git stores link text. Its parent must still belong to this repository. */
export async function readLinkBytes(
  root: string,
  path: string,
): Promise<Buffer> {
  safePath(path)
  const canonicalRoot = await realpath(root)
  const parent = await realpath(dirname(resolve(root, path)))
  if (
    !inside(canonicalRoot, parent) ||
    relative(canonicalRoot, parent).split(sep).includes('.git')
  )
    throw unavailable()
  return readlink(resolve(parent, path.slice(path.lastIndexOf('/') + 1)), {
    encoding: 'buffer',
  })
}

export async function readFileResponse(
  root: string,
  path: string,
  maxBytes: number,
): Promise<FileResponse> {
  const bytes = await readBytes(root, path, maxBytes)
  const text = textContent(bytes)
  const type = mediaType(path)
  return {
    path,
    mediaType:
      text === null && type === 'text/plain'
        ? 'application/octet-stream'
        : type,
    sizeBytes: bytes.length,
    encoding: text === null ? 'base64' : 'utf-8',
    content: text ?? bytes.toString('base64'),
  }
}

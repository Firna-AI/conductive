import { HttpError } from '../http'
import { BodyBudgetExceeded } from '../http/bounded-body'
import { ProviderError } from './errors'
import type { SandboxFileInfo, SandboxFileRead } from './provider'
import type { BoatTransport } from './transport'

function invalid(): never {
  throw new ProviderError('invalid_response', 502)
}

/** Boat answers a path under its work directory relative to that directory. */
const BOAT_WORK_DIRECTORY = '/home/user'

function samePath(reply: unknown, requested: string): boolean {
  if (typeof reply !== 'string') return false
  if (reply === requested) return true
  return (
    !reply.startsWith('/') && `${BOAT_WORK_DIRECTORY}/${reply}` === requested
  )
}

function isSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export async function readSandboxFileInfo(
  transport: BoatTransport,
  sandboxId: string,
  path: string,
): Promise<SandboxFileInfo> {
  const info = await transport.request({
    operation: 'fileInfo',
    sandboxId,
    path,
  })
  if (
    info.type !== 'file.info' ||
    (info.success !== undefined && info.success !== true) ||
    !samePath(info.path, path) ||
    typeof info.name !== 'string' ||
    typeof info.isDir !== 'boolean' ||
    typeof info.isSymlink !== 'boolean' ||
    !isSize(info.size) ||
    typeof info.mode !== 'string' ||
    typeof info.modifiedAt !== 'string'
  )
    return invalid()
  return { path, sizeBytes: info.size, isDirectory: info.isDir }
}

/** Read file content and use validated metadata to diagnose read failures. */
export async function readSandboxFile(
  transport: BoatTransport,
  sandboxId: string,
  path: string,
  maxBytes: number,
): Promise<SandboxFileRead> {
  try {
    const value = await transport.request({
      operation: 'readFile',
      sandboxId,
      path,
      maxBytes,
    })
    if (
      value.type !== 'file.read' ||
      typeof value.success !== 'boolean' ||
      !samePath(value.path, path) ||
      (value.encoding !== 'utf8' && value.encoding !== 'base64') ||
      !isSize(value.size) ||
      typeof value.content !== 'string'
    )
      return invalid()
    if (!value.success) throw new ProviderError('unavailable', 503)
    if (value.size > maxBytes)
      return { kind: 'too_large', sizeBytes: value.size, limitBytes: maxBytes }
    return {
      kind: 'file',
      file: {
        path,
        sizeBytes: value.size,
        encoding: value.encoding === 'utf8' ? 'utf-8' : 'base64',
        content: value.content,
      },
    }
  } catch (error) {
    if (!(
      error instanceof ProviderError || error instanceof BodyBudgetExceeded
    ))
      throw error
    try {
      const info = await readSandboxFileInfo(transport, sandboxId, path)
      if (info.isDirectory) return invalid()
      if (info.sizeBytes > maxBytes)
        return {
          kind: 'too_large',
          sizeBytes: info.sizeBytes,
          limitBytes: maxBytes,
        }
    } catch (metadataError) {
      if (
        error instanceof BodyBudgetExceeded ||
        metadataError instanceof HttpError
      )
        throw metadataError
      // Keep the content provider failure when ordinary metadata cannot explain its size.
    }
    if (error instanceof BodyBudgetExceeded) return invalid()
    throw error
  }
}

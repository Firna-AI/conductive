import { HttpError } from '../http'
import { BodyBudgetExceeded } from '../http/bounded-body'
import { ProviderError } from './errors'
import type { SandboxFileRead } from './provider'
import type { BoatTransport } from './transport'

function invalid(): never {
  throw new ProviderError('invalid_response', 502)
}

function isSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
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
      value.path !== path ||
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
      const info = await transport.request({
        operation: 'fileInfo',
        sandboxId,
        path,
      })
      if (
        info.type !== 'file.info' ||
        (info.success !== undefined && info.success !== true) ||
        info.path !== path ||
        typeof info.name !== 'string' ||
        info.isDir !== false ||
        typeof info.isSymlink !== 'boolean' ||
        !isSize(info.size) ||
        typeof info.mode !== 'string' ||
        typeof info.modifiedAt !== 'string'
      )
        return invalid()
      if (info.size > maxBytes)
        return { kind: 'too_large', sizeBytes: info.size, limitBytes: maxBytes }
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

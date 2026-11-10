import { constants } from 'node:fs'
import { open } from 'node:fs/promises'

import {
  PREVIEW_INGRESS_PATH,
  type PreviewIngressIdentity,
} from '../../../src/shared/preview-ingress'

export interface IngressFile {
  bytes: Uint8Array
  uid: number
  mode: number
  regular: boolean
}

export type IngressReader = () => Promise<
  PreviewIngressIdentity | null | undefined
>

async function readIngressFile(): Promise<IngressFile> {
  const file = await open(
    PREVIEW_INGRESS_PATH,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  )
  try {
    const stat = await file.stat()
    const bytes = new Uint8Array(1025)
    let size = 0
    if (stat.isFile())
      while (size < bytes.byteLength) {
        const result = await file.read(
          bytes,
          size,
          bytes.byteLength - size,
          null,
        )
        if (!result.bytesRead) break
        size += result.bytesRead
      }
    return {
      bytes: bytes.subarray(0, size),
      uid: stat.uid,
      mode: stat.mode,
      regular: stat.isFile(),
    }
  } finally {
    await file.close()
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function port(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65535
  )
}

function identity(value: unknown): PreviewIngressIdentity | null {
  const label = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
  if (
    !record(value) ||
    typeof value.sandboxId !== 'string' ||
    !label.test(value.sandboxId) ||
    typeof value.domain !== 'string' ||
    value.domain.length > 253 ||
    !value.domain.split('.').every((part) => label.test(part)) ||
    !record(value.aliases)
  )
    return null
  const aliases: Record<string, number> = {}
  for (const [key, alias] of Object.entries(value.aliases)) {
    if (!/^\d+$/.test(key) || !port(Number(key)) || !port(alias)) return null
    aliases[key] = alias
  }
  return { sandboxId: value.sandboxId, domain: value.domain, aliases }
}

export function ingressReader(
  read: () => Promise<IngressFile> = readIngressFile,
): IngressReader {
  return async () => {
    let file: IngressFile
    try {
      file = await read()
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      )
        return undefined
      return null
    }
    if (
      !file.regular ||
      file.uid !== 0 ||
      (file.mode & 0o022) !== 0 ||
      file.bytes.byteLength > 1024
    )
      return null
    try {
      return identity(JSON.parse(new TextDecoder().decode(file.bytes)))
    } catch {
      return null
    }
  }
}

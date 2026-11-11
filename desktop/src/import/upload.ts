import { createHash } from 'node:crypto'
import type { ClientRequest, IncomingMessage } from 'node:http'
import { request } from 'node:https'
import type { RequestOptions } from 'node:https'
import type {
  ImportPart,
  ImportUploadTarget,
} from '../../../src/shared/conductor-import-storage.ts'
import { LocalImportError } from './types.ts'

export type ImportPut = (
  target: ImportUploadTarget,
  bytes: Uint8Array<ArrayBuffer>,
  signal: AbortSignal,
) => Promise<number>
type RequestFactory = (
  url: URL,
  options: RequestOptions,
  callback: (response: IncomingMessage) => void,
) => ClientRequest

/** Node HTTPS has no Chromium cookie jar, credential store, redirect or proxy agent. */
export function directImportPut(create: RequestFactory = request): ImportPut {
  return (target, bytes, signal) =>
    new Promise((resolve, reject) => {
      signal.throwIfAborted()
      const url = new URL(target.url)
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.hash ||
        target.method !== 'PUT'
      )
        throw new LocalImportError('upload_failed')
      for (const name of Object.keys(target.headers))
        if (/^cookie$/i.test(name)) throw new LocalImportError('upload_failed')
      const options: RequestOptions = {
        method: 'PUT',
        headers: { ...target.headers },
        agent: false,
        signal,
      }
      const outgoing = create(url, options, (response) => {
        response.resume()
        response.once('end', () => resolve(response.statusCode ?? 0))
        response.once('error', reject)
      })
      outgoing.once('error', reject)
      outgoing.end(bytes)
    })
}

export function verifyLocalPart(part: ImportPart, bytes: Uint8Array): void {
  if (
    bytes.byteLength !== part.sizeBytes ||
    createHash('sha256').update(bytes).digest('hex') !== part.sha256
  )
    throw new LocalImportError('upload_failed')
}

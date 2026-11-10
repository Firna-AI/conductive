import { ProviderError } from './errors'
import { linkWorkerError } from '../error-reporting/causes'
import { fileWriteBody } from './file-write-body'
import type { BoatTransport } from './transport'

function uploadUrl(value: Record<string, unknown>, path: string): string {
  if (
    value.type !== 'file.upload_url' ||
    value.method !== 'PUT' ||
    value.path !== path ||
    typeof value.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    Date.parse(value.expiresAt) <= Date.now() ||
    typeof value.url !== 'string'
  )
    throw new ProviderError('invalid_response', 502)
  let url: URL
  try {
    url = new URL(value.url)
  } catch (error) {
    throw linkWorkerError(new ProviderError('invalid_response', 502), error)
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new ProviderError('invalid_response', 502)
  return value.url
}

/** Keep the signed grant inside this adapter and stream only to its bound path. */
export async function writeSandboxFile(
  transport: BoatTransport,
  sandboxId: string,
  path: string,
  body: ReadableStream<Uint8Array>,
  sizeBytes: number,
): Promise<void> {
  let transfer: ReturnType<typeof fileWriteBody> | undefined
  try {
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)
      throw new ProviderError('invalid_request', 400)
    const value = await transport.request(
      { operation: 'uploadFileUrl', sandboxId },
      { path },
    )
    const url = uploadUrl(value, path)
    transfer = fileWriteBody(body, sizeBytes)
    await transport.uploadFile(url, transfer.body)
    if (!transfer.complete()) throw new ProviderError('unavailable', 503)
  } catch (error) {
    await (transfer ? transfer.cancel() : body.cancel()).catch(() => undefined)
    const cause = transfer?.failure()
    if (typeof error === 'object' && error !== null && cause !== undefined)
      linkWorkerError(error, cause)
    throw error
  }
}

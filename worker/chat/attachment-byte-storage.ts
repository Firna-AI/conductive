import { ATTACHMENT_MAX_BYTES } from '../../src/shared/messages'
import { attachmentTooLarge } from './attachment-record'

const INTERNAL_PART_BYTES = 5_242_880

/** Streams one private object. These parts have no browser route or persisted part table. */
export async function writeAttachmentObject(
  bucket: R2Bucket,
  key: string,
  metadata: Record<string, string>,
  source: Uint8Array | ReadableStream<Uint8Array>,
  saveMultipart: (id: string) => Promise<void>,
  knownLength?: number,
): Promise<number> {
  if (knownLength !== undefined) {
    if (knownLength > ATTACHMENT_MAX_BYTES) throw attachmentTooLarge()
    const object = await bucket.put(key, source, { customMetadata: metadata })
    if (!object || object.size !== knownLength)
      throw new Error('The attachment byte count did not match.')
    return object.size
  }
  if (source instanceof Uint8Array) {
    if (source.byteLength > ATTACHMENT_MAX_BYTES) throw attachmentTooLarge()
    await bucket.put(key, source, { customMetadata: metadata })
    return source.byteLength
  }
  const reader = source.getReader()
  const buffer = new Uint8Array(INTERNAL_PART_BYTES)
  let filled = 0
  let size = 0
  let upload: R2MultipartUpload | undefined
  const parts: R2UploadedPart[] = []
  const flush = async () => {
    if (!upload) {
      upload = await bucket.createMultipartUpload(key, {
        customMetadata: metadata,
      })
      await saveMultipart(upload.uploadId)
    }
    parts.push(
      await upload.uploadPart(parts.length + 1, buffer.subarray(0, filled)),
    )
    filled = 0
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value.byteLength > ATTACHMENT_MAX_BYTES - size)
        throw attachmentTooLarge()
      size += value.byteLength
      let offset = 0
      while (offset < value.byteLength) {
        const length = Math.min(
          buffer.byteLength - filled,
          value.byteLength - offset,
        )
        buffer.set(value.subarray(offset, offset + length), filled)
        filled += length
        offset += length
        if (filled === buffer.byteLength) await flush()
      }
    }
    if (upload) {
      if (filled) await flush()
      await upload.complete(parts)
    } else
      await bucket.put(key, buffer.subarray(0, filled), {
        customMetadata: metadata,
      })
    return size
  } catch (error) {
    void reader.cancel(error).catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}

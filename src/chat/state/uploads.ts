import type { UploadAttachmentRequest } from '../../shared/messages'

const CHUNK = 0x8000

/** Base64 of the bytes, in chunks, so a large file fits the argument limit. */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK))
  }
  return btoa(binary)
}

/**
 * A file as the JSON upload that the app gate accepts. An image goes to the
 * model as an image too, so the kind follows the media type.
 */
export async function toUpload(file: File): Promise<UploadAttachmentRequest> {
  const mediaType = file.type || 'application/octet-stream'
  return {
    name: file.name,
    kind: mediaType.startsWith('image/') ? 'image' : 'file',
    mediaType,
    dataBase64: toBase64(new Uint8Array(await file.arrayBuffer())),
  }
}

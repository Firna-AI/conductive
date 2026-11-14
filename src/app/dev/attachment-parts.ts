import { tooLargeBody } from '../../../docs/mockups/src/components/chat/attachmentCopy'
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_PART_BYTES,
  attachmentUploadCompletePath,
  attachmentUploadPartPath,
  attachmentUploadStartPath,
  type Attachment,
  type AttachmentUploadPart,
  type AttachmentUploadTarget,
  type StartAttachmentUploadResponse,
  type UploadAttachmentResponse,
} from '../../shared/messages'
import {
  count,
  items,
  ParseError,
  record,
  text,
  type JsonObject,
} from '../api/parse'
import { ID } from './router'

/** The kind of target of an upload, as its routes name it. */
export type DevUploadTarget = AttachmentUploadTarget['type']

/**
 * The paths of the upload routes of a target, for `match` of the dev router:
 * `:upload` stands for the upload ID, and `:part` for the part number.
 */
export function uploadRoutes(orgId: string, target: AttachmentUploadTarget) {
  return {
    start: attachmentUploadStartPath(orgId, target),
    part: attachmentUploadPartPath(orgId, target, ID.upload, 1).replace(
      /\/1$/,
      `/${ID.part}`,
    ),
    complete: attachmentUploadCompletePath(orgId, target, ID.upload),
  }
}

/** The file that a complete call puts together from its parts. */
export interface DevUploadedFile {
  name: string
  mediaType: string
  bytes: ArrayBuffer
}

interface DevUpload {
  target: DevUploadTarget
  name: string
  mediaType: string
  sizeBytes: number
  /** The stored parts by number, each with the etag of its receipt. */
  parts: Map<number, { etag: string; bytes: ArrayBuffer }>
}

function refusal(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status })
}

function notFound(): Response {
  return refusal(
    404,
    'attachment_not_found',
    'The attached file is not available. Upload it again.',
  )
}

function invalidInput(): Response {
  return refusal(400, 'invalid_input', 'Complete the required fields.')
}

function partCountOf(sizeBytes: number): number {
  return Math.max(1, Math.ceil(sizeBytes / ATTACHMENT_PART_BYTES))
}

/** Each part has the part size, and the last part holds the rest. */
function partLength(upload: DevUpload, partNumber: number): number {
  const start = (partNumber - 1) * ATTACHMENT_PART_BYTES
  return Math.min(ATTACHMENT_PART_BYTES, upload.sizeBytes - start)
}

/** A text field that holds more than spaces, as the Worker requires. */
function filled(fields: JsonObject, key: string): string {
  const value = text(fields, key).trim()
  if (value === '') throw new ParseError(`${key} is empty.`)
  return value
}

function readReceipt(value: unknown): AttachmentUploadPart {
  const part = record(value)
  return { partNumber: count(part, 'partNumber'), etag: text(part, 'etag') }
}

/**
 * The uploads in parts of a dev fake, with the checks of the Worker. The
 * start call declares the size, and refuses a file over the limit. Each
 * part needs the length of its number, and a part that goes again takes
 * the place of the earlier one. The complete call names each part once with
 * its receipt. The fake keeps the bytes of each part in the page until the
 * complete call puts them together.
 */
export class DevPartUploads {
  private readonly uploads = new Map<string, DevUpload>()
  private requests = 0

  start(target: DevUploadTarget, body: unknown): Response {
    let upload: DevUpload
    try {
      const fields = record(body)
      const sizeBytes = count(fields, 'sizeBytes')
      if (sizeBytes > ATTACHMENT_MAX_BYTES) {
        return refusal(413, 'attachment_too_large', tooLargeBody)
      }
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
        throw new ParseError('sizeBytes is not a size.')
      }
      if (target === 'new-workspace') filled(fields, 'messageId')
      upload = {
        target,
        name: filled(fields, 'name'),
        mediaType: filled(fields, 'mediaType'),
        sizeBytes,
        parts: new Map(),
      }
    } catch (error) {
      if (error instanceof ParseError) return invalidInput()
      throw error
    }
    const uploadId = `dev-upload-${(this.requests += 1)}`
    this.uploads.set(uploadId, upload)
    return Response.json(
      {
        uploadId,
        partSizeBytes: ATTACHMENT_PART_BYTES,
        partCount: partCountOf(upload.sizeBytes),
      } satisfies StartAttachmentUploadResponse,
      { status: 201 },
    )
  }

  part(
    target: DevUploadTarget,
    uploadId: string,
    partNumber: string,
    body: unknown,
  ): Response {
    const upload = this.uploads.get(uploadId)
    if (upload?.target !== target) return notFound()
    const number = Number(partNumber)
    const unfinished = (code: string) =>
      refusal(400, code, 'The file upload did not finish. Try again.')
    if (
      !/^[1-9][0-9]*$/.test(partNumber) ||
      number > partCountOf(upload.sizeBytes)
    ) {
      return unfinished('attachment_part_invalid')
    }
    if (
      !(body instanceof ArrayBuffer) ||
      body.byteLength !== partLength(upload, number)
    ) {
      return unfinished('attachment_part_size_mismatch')
    }
    const etag = `dev-part-${(this.requests += 1)}`
    upload.parts.set(number, { etag, bytes: body.slice(0) })
    return Response.json({
      partNumber: number,
      etag,
    } satisfies AttachmentUploadPart)
  }

  /**
   * Puts the parts together and gives the file to `publish`, which makes
   * its attachment, as the Worker publishes a completed upload.
   */
  async complete(
    target: DevUploadTarget,
    uploadId: string,
    body: unknown,
    publish: (file: DevUploadedFile) => Promise<Attachment>,
  ): Promise<Response> {
    const upload = this.uploads.get(uploadId)
    if (upload?.target !== target) return notFound()
    let receipts: AttachmentUploadPart[]
    try {
      receipts = items(record(body), 'parts', readReceipt)
    } catch (error) {
      if (error instanceof ParseError) return invalidInput()
      throw error
    }
    receipts.sort((left, right) => left.partNumber - right.partNumber)
    if (
      receipts.length !== partCountOf(upload.sizeBytes) ||
      receipts.some(
        ({ partNumber, etag }, index) =>
          partNumber !== index + 1 ||
          upload.parts.get(partNumber)?.etag !== etag,
      )
    ) {
      return invalidInput()
    }
    this.uploads.delete(uploadId)
    const bytes = new Uint8Array(upload.sizeBytes)
    for (const { partNumber } of receipts) {
      const part = upload.parts.get(partNumber)?.bytes ?? new ArrayBuffer(0)
      bytes.set(new Uint8Array(part), (partNumber - 1) * ATTACHMENT_PART_BYTES)
    }
    const { name, mediaType } = upload
    const attachment = await publish({ name, mediaType, bytes: bytes.buffer })
    return Response.json({ attachment } satisfies UploadAttachmentResponse, {
      status: 201,
    })
  }
}

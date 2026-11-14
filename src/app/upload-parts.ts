import type {
  AttachmentUploadPart,
  StartAttachmentUploadResponse,
} from '../shared/messages'
import { ApiError } from './api/client'
import { count, record, text } from './api/parse'

// The parts of an upload in parts: their bytes, their receipts, the replies
// of the Worker, and the failures that a part can survive.

/**
 * An upload in parts that the Worker started for one file, with the receipt
 * of each part that the Worker confirmed. The tab keeps it with the file, so
 * a later try sends only the parts with no receipt.
 */
export interface PartedUpload {
  uploadId: string
  partSizeBytes: number
  partCount: number
  /** The receipts of the confirmed parts, in the order of their numbers. */
  receipts: readonly AttachmentUploadPart[]
}

/**
 * The errors of a part after which the upload cannot go on: the Worker no
 * longer has it, or the part does not fit it.
 */
export const PART_ENDS = [
  'attachment_not_found',
  'attachment_part_invalid',
  'attachment_part_size_mismatch',
]

/**
 * The errors of the complete call after which the upload cannot go on: the
 * Worker no longer has it, it ended it, or it refused its receipts.
 */
export const COMPLETE_ENDS = [
  'attachment_not_found',
  'attachment_size_mismatch',
  'attachment_upload_failed',
  'invalid_input',
]

/** A part can go again: no answer came, the server failed, or its body broke off. */
export function canRetry(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'network' ||
      error.status >= 500 ||
      error.code === 'attachment_upload_interrupted')
  )
}

/** The bytes of one part. Each part but the last has the part size. */
export function partBytes(
  upload: PartedUpload,
  sizeBytes: number,
  partNumber: number,
) {
  const start = (partNumber - 1) * upload.partSizeBytes
  const end =
    partNumber === upload.partCount ? sizeBytes : start + upload.partSizeBytes
  return { start, end }
}

/** The bytes of the parts that the Worker confirmed. */
export function keptBytes(upload: PartedUpload, sizeBytes: number): number {
  return upload.receipts.reduce((total, { partNumber }) => {
    const { start, end } = partBytes(upload, sizeBytes, partNumber)
    return total + end - start
  }, 0)
}

/** The upload with the receipt of one more part, in the order of the parts. */
export function withReceipt(
  upload: PartedUpload,
  receipt: AttachmentUploadPart,
): PartedUpload {
  const receipts = upload.receipts.filter(
    ({ partNumber }) => partNumber !== receipt.partNumber,
  )
  receipts.push(receipt)
  receipts.sort((left, right) => left.partNumber - right.partNumber)
  return { ...upload, receipts }
}

/** The reply of the start call: the upload ID, the part size, and the count. */
export function readStart(body: unknown): StartAttachmentUploadResponse {
  const reply = record(body)
  return {
    uploadId: text(reply, 'uploadId'),
    partSizeBytes: count(reply, 'partSizeBytes'),
    partCount: count(reply, 'partCount'),
  }
}

/** The reply of a part: its receipt. */
export function readReceipt(body: unknown): AttachmentUploadPart {
  const part = record(body)
  return { partNumber: count(part, 'partNumber'), etag: text(part, 'etag') }
}

import {
  attachmentUploadCompletePath,
  attachmentUploadPartPath,
  attachmentUploadStartPath,
  type Attachment,
  type AttachmentUploadTarget,
} from '../shared/messages'
import {
  createApiClient,
  type FetchLike,
  type FileReply,
  type FileTransport,
} from './api/client'
import { uploadAttachment } from './attachment-upload'
import type { PartedUpload } from './upload-parts'

// The fake Worker of the tests of `uploadAttachment`: one upload of a file
// of ten bytes in parts of four bytes, and what the upload reports.

const org = 'acme'
const workspace: AttachmentUploadTarget = {
  type: 'workspace',
  workspaceId: 'checkout',
}
export const uploaded: Attachment = {
  id: 'attachment-1',
  name: 'notes.txt',
  path: '.context/attachments/0123/notes.txt',
  kind: 'file',
  mediaType: 'text/plain',
  sizeBytes: 10,
}
/** Ten bytes, so parts of four bytes give three parts: 4, 4, and 2. */
const notes = () =>
  new File(['0123456789'], 'notes.txt', { type: 'text/plain' })

/** The receipt of a part, as the Worker gives it. */
export const receipt = (partNumber: number) => ({
  partNumber,
  etag: `etag-${partNumber}`,
})

export const refusal = (status: number, code: string): FileReply => ({
  status,
  body: { error: { code, message: 'The file upload did not finish.' } },
})

/** What a part gets: a reply, no answer, or a wait that the test ends. */
type PartReply = FileReply | 'offline' | Promise<FileReply>

/**
 * A Worker for one upload. The start call gives `upload-7` with the parts
 * of `start`. Each part takes the next reply of `parts` for its number, or
 * else its receipt. The browser reports half of each part as sent, then
 * all of it. The complete call gives the file, or `complete`.
 */
export function worker(
  script: {
    target?: AttachmentUploadTarget
    start?: { partSizeBytes: number; partCount: number }
    parts?: Record<number, PartReply[]>
    complete?: () => Response
  } = {},
) {
  const target = script.target ?? workspace
  const calls: string[] = []
  const bodies: unknown[] = []
  const fetch: FetchLike = async (input, init) => {
    const body: unknown = JSON.parse(String(init?.body))
    bodies.push(body)
    if (input === attachmentUploadStartPath(org, target)) {
      calls.push('start')
      const parts = script.start ?? { partSizeBytes: 4, partCount: 3 }
      return Response.json({ uploadId: 'upload-7', ...parts }, { status: 201 })
    }
    if (input !== attachmentUploadCompletePath(org, target, 'upload-7')) {
      throw new Error(`No route for ${input}`)
    }
    calls.push('complete')
    return (
      script.complete?.() ??
      Response.json({ attachment: uploaded }, { status: 201 })
    )
  }
  const files: FileTransport = async ({ path, body, progress }) => {
    const partNumber = [1, 2, 3].find(
      (number) =>
        path === attachmentUploadPartPath(org, target, 'upload-7', number),
    )
    if (partNumber === undefined) throw new Error(`No part at ${path}`)
    calls.push(`part ${partNumber}: ${await body.text()}`)
    progress(Math.ceil(body.size / 2))
    progress(body.size)
    const reply = script.parts?.[partNumber]?.shift() ?? {
      status: 200,
      body: receipt(partNumber),
    }
    if (reply === 'offline') throw new Error('The upload failed.')
    return reply
  }
  return { api: createApiClient(fetch, files), calls, bodies, target }
}

/** Runs one upload, and keeps what it reported. */
export async function run(
  setup: ReturnType<typeof worker>,
  options: {
    file?: File
    resume?: PartedUpload | null
    signal?: AbortSignal
  } = {},
) {
  const progress: number[] = []
  const kept: (PartedUpload | null)[] = []
  const result = await uploadAttachment({
    api: setup.api,
    orgId: org,
    target: setup.target,
    file: options.file ?? notes(),
    resume: options.resume ?? null,
    progress: (sentBytes) => progress.push(sentBytes),
    keep: (upload) => kept.push(upload),
    live: () => true,
    signal: options.signal ?? new AbortController().signal,
  }).catch((error: unknown) => error)
  return { result, progress, kept, last: kept.at(-1) }
}

export const upload = (receipts: number[]): PartedUpload => ({
  uploadId: 'upload-7',
  partSizeBytes: 4,
  partCount: 3,
  receipts: receipts.map(receipt),
})

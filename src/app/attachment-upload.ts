import {
  attachmentUploadCompletePath,
  attachmentUploadPartPath,
  attachmentUploadStartPath,
  type Attachment,
  type AttachmentUploadPart,
  type AttachmentUploadTarget,
  type CompleteAttachmentUploadRequest,
  type StartAttachmentUploadRequest,
} from '../shared/messages'
import { ApiError, type ApiClient } from './api/client'
import { nested, record } from './api/parse'
import { readAttachment } from './api/read-workspaces'
import type { Delay } from './events'
import {
  canRetry,
  COMPLETE_ENDS,
  keptBytes,
  PART_ENDS,
  PART_RETRY_WAITS_MS,
  partBytes,
  pause,
  readReceipt,
  readStart,
  withReceipt,
  type PartedUpload,
} from './upload-parts'

/**
 * What an upload reports, the upload that it resumes, the check that it
 * makes before each request, the signal that stops the request that runs,
 * and the timer of its waits.
 */
export interface UploadHooks {
  /** The upload that an earlier try of the file kept, or null for a new one. */
  resume: PartedUpload | null
  /** Gets the bytes of the file that the browser sent so far, over all parts. */
  progress: (sentBytes: number) => void
  /**
   * Gets the upload after its start and after each confirmed part. It gets
   * null when the upload cannot go on, so a later try starts a new one.
   */
  keep: (upload: PartedUpload | null) => void
  /**
   * The upload may still send: its file is in the draft, and the person and
   * the chat that started it go on.
   */
  live: () => boolean
  /** Stops the request that runs, such as after Remove or a sign-out. */
  signal: AbortSignal
  /**
   * The timer of the composer, for the waits before a failed part goes
   * again. A test gives a timer that runs only when the test says so.
   */
  delay: Delay
}

/** One upload of a file, to a workspace or to the first message of a new one. */
interface AttachmentUploadJob extends UploadHooks {
  api: ApiClient
  orgId: string
  target: AttachmentUploadTarget
  file: File
}

/** The upload stopped before a request, because `live` or `signal` said so. */
class UploadStopped extends Error {}

/** A failure after which the upload cannot go on. It holds the failure. */
class UploadEnded extends Error {
  readonly failure: ApiError

  constructor(failure: ApiError) {
    super(failure.message)
    this.failure = failure
  }
}

/**
 * Uploads one file in parts and gives its attachment. Both composers upload
 * only through this function. Each file uses the parts, also a small or an
 * empty one: the start call names the file, its media type, its size, and
 * the message of a new workspace. Then each part goes in its order, as a
 * slice of the file, and the complete call sends the receipts.
 *
 * A part that got no answer, a server error, or a broken body goes again
 * alone, after the waits of `PART_RETRY_WAITS_MS` on the timer `delay`. A
 * stop of `signal` during a wait ends the upload at once.
 *
 * `resume` gives the upload of an earlier try, so only its parts with no
 * receipt go. When the Worker no longer has that upload, a new one starts.
 * `keep` gets each change of the upload, and `progress` the bytes of all
 * parts that the browser sent. No request starts when `live` says no, and
 * `signal` stops the one that runs. A failure throws the client's
 * `ApiError`.
 */
export async function uploadAttachment(
  job: AttachmentUploadJob,
): Promise<Attachment> {
  try {
    if (job.resume !== null) {
      try {
        return await sendParts(job, job.resume)
      } catch (error) {
        if (!(error instanceof UploadEnded)) throw error
      }
    }
    return await sendParts(job, await start(job))
  } catch (error) {
    throw error instanceof UploadEnded ? error.failure : error
  }
}

function going(job: AttachmentUploadJob): boolean {
  return job.live() && !job.signal.aborted
}

function goOn(job: AttachmentUploadJob): void {
  if (!going(job)) throw new UploadStopped('The upload stopped.')
}

async function start(job: AttachmentUploadJob): Promise<PartedUpload> {
  goOn(job)
  const { file, target } = job
  const request: StartAttachmentUploadRequest = {
    name: file.name,
    mediaType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    ...(target.type === 'new-workspace' ? { messageId: target.messageId } : {}),
  }
  const started = await job.api.send(
    'POST',
    attachmentUploadStartPath(job.orgId, target),
    request,
    readStart,
  )
  return { ...started, receipts: [] }
}

async function sendParts(
  job: AttachmentUploadJob,
  upload: PartedUpload,
): Promise<Attachment> {
  let kept = upload
  job.keep(kept)
  for (let partNumber = 1; partNumber <= kept.partCount; partNumber += 1) {
    if (kept.receipts.some((receipt) => receipt.partNumber === partNumber))
      continue
    kept = withReceipt(kept, await sendPart(job, kept, partNumber))
    job.keep(kept)
  }
  return complete(job, kept)
}

async function sendPart(
  job: AttachmentUploadJob,
  upload: PartedUpload,
  partNumber: number,
): Promise<AttachmentUploadPart> {
  const { start, end } = partBytes(upload, job.file.size, partNumber)
  const before = keptBytes(upload, job.file.size)
  const path = attachmentUploadPartPath(
    job.orgId,
    job.target,
    upload.uploadId,
    partNumber,
  )
  for (let retries = 0; ; retries += 1) {
    goOn(job)
    try {
      return await job.api.sendPart(
        path,
        job.file.slice(start, end),
        readReceipt,
        {
          progress: (sentBytes) => job.progress(before + sentBytes),
          signal: job.signal,
        },
      )
    } catch (error) {
      const wait = PART_RETRY_WAITS_MS.at(retries)
      if (wait === undefined || !canRetry(error) || !going(job)) {
        throw ended(job, error, PART_ENDS)
      }
      await pause(job.delay, wait, job.signal)
    }
  }
}

async function complete(
  job: AttachmentUploadJob,
  upload: PartedUpload,
): Promise<Attachment> {
  goOn(job)
  const request: CompleteAttachmentUploadRequest = { parts: upload.receipts }
  try {
    return await job.api.send(
      'POST',
      attachmentUploadCompletePath(job.orgId, job.target, upload.uploadId),
      request,
      (body) => nested(record(body), 'attachment', readAttachment),
    )
  } catch (error) {
    throw ended(job, error, COMPLETE_ENDS)
  }
}

/**
 * The failure to throw. One of `codes` ends the upload: the job drops it
 * first, so a later try starts a new one.
 */
function ended(
  job: AttachmentUploadJob,
  error: unknown,
  codes: readonly string[],
): unknown {
  if (!(error instanceof ApiError) || !codes.includes(error.code)) return error
  job.keep(null)
  return new UploadEnded(error)
}

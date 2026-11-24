import { HttpError } from '../http'
import { isTransientHostError } from '../machines/errors'
import { ProviderError } from '../sandbox/errors'
import type { AttachmentStep } from '../warning-types'
import { WarningId, errorSummary } from '../warning-values'
import { warnWorker } from '../warnings'

export const ATTACHMENT_COPY_FAILED_MESSAGE =
  'The attached files could not reach the cloud computer. Try again.'

const ATTACHMENT_COPY_UNANSWERED_MESSAGE =
  'The cloud computer did not answer, so the attached files did not arrive. Try again.'

/**
 * A step of a file check or download failed. The turn shows its
 * message, and the log shows its step and the summary of its cause.
 */
export class AttachmentTransferFailed extends HttpError {
  readonly step: AttachmentStep
  readonly failure: unknown
  /** The command or file operation gave no answer. */
  readonly unanswered: boolean

  constructor(step: AttachmentStep, failure: unknown) {
    const unanswered =
      isTransientHostError(failure) ||
      (failure instanceof ProviderError &&
        failure.kind === 'unavailable' &&
        failure.status >= 500)
    super(
      503,
      'attachment_copy_failed',
      unanswered
        ? ATTACHMENT_COPY_UNANSWERED_MESSAGE
        : ATTACHMENT_COPY_FAILED_MESSAGE,
    )
    this.step = step
    this.failure = failure
    this.unanswered = unanswered
  }
}

/**
 * Retry a check or download once after an unanswered call. If the retry
 * starts a new download, it gets a new token.
 */
export async function retryUnanswered<T>(
  workspaceId: string,
  run: (retry?: AttachmentTransferFailed) => Promise<T>,
): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (!(error instanceof AttachmentTransferFailed) || !error.unanswered)
      throw error
    warnWorker({
      kind: 'attachment_transfer_retried',
      workspaceId: WarningId.checked(workspaceId),
      step: error.step,
      error: errorSummary(error.failure),
    })
    return run(error)
  }
}

/** Log why the files of a message did not reach the cloud computer. */
export function warnAttachmentCopyFailed(
  workspaceId: string,
  error: unknown,
): void {
  const transfer = error instanceof AttachmentTransferFailed ? error : null
  warnWorker({
    kind: 'attachment_copy_failed',
    workspaceId: WarningId.checked(workspaceId),
    step: transfer?.step ?? null,
    error: errorSummary(transfer ? transfer.failure : error),
  })
}

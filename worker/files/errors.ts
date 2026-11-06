import type { FileTooLargeResponse } from '../../src/shared/files'
import { HttpError } from '../http'

export function fileUnavailable(): HttpError {
  return new HttpError(
    503,
    'file_unavailable',
    'The file is not available. Try again when the cloud computer is ready.',
  )
}

export function invalidFileResponse(): HttpError {
  return new HttpError(
    502,
    'file_unavailable',
    'The file could not be read. Try again.',
  )
}

export class FileTooLargeError extends HttpError {
  readonly sizeBytes: number
  readonly limitBytes: number

  constructor(sizeBytes: number, limitBytes: number) {
    super(413, 'file_too_large', 'The file is too large to open.')
    this.sizeBytes = sizeBytes
    this.limitBytes = limitBytes
  }

  response(): Response {
    return Response.json(
      {
        error: {
          code: 'file_too_large',
          message: this.message,
          sizeBytes: this.sizeBytes,
          limitBytes: this.limitBytes,
        },
      } satisfies FileTooLargeResponse,
      { status: this.status },
    )
  }
}

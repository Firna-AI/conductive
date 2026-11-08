import { isFilePath } from '../../src/shared/file-path'
import { HttpError } from '../http'

export function readFilePath(value: unknown): string {
  if (!isFilePath(value)) {
    throw new HttpError(
      400,
      'invalid_input',
      'Choose a file in this repository.',
    )
  }
  return value
}

export function checkByteLimit(maxBytes: number): void {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error('Configure a non-negative file byte limit.')
  }
}

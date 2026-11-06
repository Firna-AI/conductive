import { HttpError } from '../http'

export function isFilePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\\') &&
    ![...value].some((character) => character.charCodeAt(0) < 32) &&
    value
      .split('/')
      .every((part) => part !== '' && part !== '.' && part !== '..')
  )
}

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

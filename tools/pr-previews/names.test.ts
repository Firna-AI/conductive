import { expect, it } from 'vitest'
import { previewNames } from './names.ts'

it('derives the Worker, database, hostnames, and origins from a pull request', () => {
  expect(previewNames(123, 'preview.example')).toEqual({
    number: 123,
    zone: 'preview.example',
    workerName: 'conductive-pr-123',
    databaseName: 'conductive-pr-123',
    marketingHost: 'pr-123.preview.example',
    appHost: 'pr-123-app.preview.example',
    machineHost: 'pr-123-api.preview.example',
    marketingOrigin: 'https://pr-123.preview.example',
    appOrigin: 'https://pr-123-app.preview.example',
    machineOrigin: 'https://pr-123-api.preview.example',
  })
})

it('rejects pull request numbers that are not positive safe integers', () => {
  for (const number of [
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    expect(
      () => previewNames(number, 'preview.example'),
      String(number),
    ).toThrowError('Pull request number must be a positive safe integer.')
  }
})

it('rejects zones that are not lower-case DNS names with at least one dot', () => {
  const invalid = [
    '',
    'localhost',
    'Preview.example',
    'https://preview.example',
    'preview.example:443',
    'preview.example/path',
    '*.preview.example',
    '.preview.example',
    'preview.example.',
    'preview..example',
    '-preview.example',
    'preview-.example',
    'pre_view.example',
    'preview.example\n',
    `${'a'.repeat(64)}.example`,
    Array.from({ length: 4 }, () => 'a'.repeat(63)).join('.'),
  ]
  for (const zone of invalid) {
    expect(() => previewNames(123, zone), zone).toThrowError(
      'PREVIEW_ZONE must be a lower-case DNS name with at least one dot.',
    )
  }
})

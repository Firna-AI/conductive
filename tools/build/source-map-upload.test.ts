import { expect, it, vi } from 'vitest'
import {
  readSourceMapUploadSettings,
  runSourceMapUpload,
} from './source-map-upload.ts'

const settings = {
  SENTRY_AUTH_TOKEN: 'private-upload-token',
  SENTRY_URL: 'https://eu-nbg-2-sourcemaps.betterstackdata.com',
  SENTRY_ORG: 'team',
  SENTRY_WORKER_PROJECT: 'worker',
  SENTRY_BROWSER_PROJECT: 'browser',
}

it('enables uploads only with a checkout release and all five settings', () => {
  expect(readSourceMapUploadSettings('conductive@commit', settings)).toEqual({
    authToken: 'private-upload-token',
    url: 'https://eu-nbg-2-sourcemaps.betterstackdata.com',
    org: 'team',
    workerProject: 'worker',
    browserProject: 'browser',
  })
  expect(readSourceMapUploadSettings(undefined, settings)).toBeUndefined()
  for (const missing of Object.keys(settings)) {
    expect(
      readSourceMapUploadSettings('conductive@commit', {
        ...settings,
        [missing]: ' ',
      }),
      missing,
    ).toBeUndefined()
  }
})

it('keeps an upload failure recoverable and hides its raw error', async () => {
  const warn = vi.fn()

  await expect(
    runSourceMapUpload(async () => {
      throw new Error('private-upload-token: rejected request body')
    }, warn),
  ).resolves.toBeUndefined()
  expect(warn.mock.calls).toEqual([
    ['Error-reporting source map upload failed. The build will continue.'],
  ])
})

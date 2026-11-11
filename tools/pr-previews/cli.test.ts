import { afterEach, expect, it, vi } from 'vitest'
import { runPreviewCommand } from './cli.ts'
import { writePreviewConfig } from './config.ts'
import { configInputs } from './config.test-support.ts'
import { previewEnvironment } from './settings.test-support.ts'

vi.mock('./config.ts', () => ({ writePreviewConfig: vi.fn() }))
afterEach(() => vi.resetAllMocks())

function configArgs() {
  return [
    'config',
    '--pr',
    '123',
    '--database-id',
    '00000000-0000-4000-8000-000000000123',
    '--runner-url',
    'https://runner.preview.example/runner-test.tar.gz',
    '--runner-sha256',
    'a'.repeat(64),
    '--build-config',
    '/artifact/dist/conductive/wrangler.json',
  ]
}

it('dispatches config inputs and returns the generated path for stdout', async () => {
  vi.mocked(writePreviewConfig).mockResolvedValue(
    '/artifact/dist/conductive/wrangler.pr-123.json',
  )
  const environment = {
    ...previewEnvironment(),
    CONDUCTIVE_FRAME_SOURCES: 'https://frames.example',
  }
  await expect(runPreviewCommand(configArgs(), environment)).resolves.toEqual({
    kind: 'written',
    path: '/artifact/dist/conductive/wrangler.pr-123.json',
  })
  expect(writePreviewConfig).toHaveBeenCalledExactlyOnceWith(
    '/artifact/dist/conductive/wrangler.json',
    configInputs(),
  )
})

it('returns a warning and writes nothing when preview setup is absent', async () => {
  await expect(runPreviewCommand(configArgs(), {})).resolves.toEqual({
    kind: 'skip',
    warning: 'Preview settings are absent. Skipping preview configuration.',
  })
  expect(writePreviewConfig).not.toHaveBeenCalled()
})

it('fails for partial setup without exposing a configured token', async () => {
  await expect(
    runPreviewCommand(configArgs(), {
      ...previewEnvironment(),
      BOAT_API_KEY: undefined,
    }),
  ).rejects.toThrowError('Missing preview settings: BOAT_API_KEY.')
  expect(writePreviewConfig).not.toHaveBeenCalled()
})

it('rejects unknown commands and missing config arguments before writing', async () => {
  await expect(
    runPreviewCommand(['unknown'], previewEnvironment()),
  ).rejects.toThrowError('Unknown preview command. Use --help for usage.')
  await expect(
    runPreviewCommand(['config'], previewEnvironment()),
  ).rejects.toThrowError(
    'config requires --pr, --database-id, --runner-url, and --runner-sha256.',
  )
  expect(writePreviewConfig).not.toHaveBeenCalled()
})

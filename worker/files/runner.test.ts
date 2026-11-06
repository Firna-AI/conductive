import { expect, it, vi } from 'vitest'

import { recordedFileResponses } from '../../src/test-support/recorded-files'
import { connectFilesRunner } from './test-support/runner'

it('matches concurrent file and diff results by request, type, path, branch, and connection', async () => {
  const { files, runner } = await connectFilesRunner()
  const path = 'src/app/checkout/AddressForm.tsx'
  const read = files.read(path, 1024)
  const diff = files.diff(path, 'main')
  expect(runner.commands).toEqual([
    { type: 'file.read', requestId: 'request-1', path, maxBytes: 1024 },
    { type: 'file.diff', requestId: 'request-2', path, defaultBranch: 'main' },
  ])
  expect(
    files.receive('connection-1', {
      ...recordedFileResponses[0],
      requestId: 'unknown',
    }),
  ).toBe(false)
  expect(
    files.receive('old-connection', {
      ...recordedFileResponses[0],
      requestId: 'request-1',
    }),
  ).toBe(false)
  expect(
    files.receive('connection-1', {
      ...recordedFileResponses[1],
      requestId: 'request-1',
    }),
  ).toBe(false)
  runner.reply({ ...recordedFileResponses[1], requestId: 'request-2' })
  runner.reply({ ...recordedFileResponses[0], requestId: 'request-1' })
  expect(await diff).toMatchObject({ path, baseBranch: 'main', binary: false })
  expect(await read).toMatchObject({ path, sizeBytes: 73, encoding: 'utf-8' })
  expect(
    files.receive('connection-1', {
      ...recordedFileResponses[0],
      requestId: 'request-1',
    }),
  ).toBe(false)
})

it('enforces the configured byte limit on runner text, binary, and size errors', async () => {
  const { files, runner } = await connectFilesRunner()
  const text = files.read('message.txt', 3)
  runner.reply({
    type: 'file.read.result',
    requestId: 'request-1',
    result: {
      ok: true,
      file: {
        path: 'message.txt',
        mediaType: 'text/plain',
        encoding: 'utf-8',
        content: 'éé',
        sizeBytes: 1,
      },
    },
  })
  await expect(text).rejects.toMatchObject({
    status: 413,
    sizeBytes: 4,
    limitBytes: 3,
  })
  const binary = files.read('image.bin', 3)
  runner.reply({
    type: 'file.read.result',
    requestId: 'request-2',
    result: {
      ok: true,
      file: {
        path: 'image.bin',
        mediaType: 'application/octet-stream',
        encoding: 'base64',
        content: 'AAH/',
        sizeBytes: 3,
      },
    },
  })
  expect(await binary).toMatchObject({
    encoding: 'base64',
    sizeBytes: 3,
    content: 'AAH/',
  })
  const limit = files.read('large.txt', 16)
  runner.reply({ ...recordedFileResponses[2], requestId: 'request-3' })
  await expect(limit).rejects.toMatchObject({
    status: 413,
    sizeBytes: 73,
    limitBytes: 16,
  })
  const largeBinary = files.read('large-image.bin', 4_194_304)
  runner.reply({
    type: 'file.read.result',
    requestId: 'request-4',
    result: {
      ok: true,
      file: {
        path: 'large-image.bin',
        mediaType: 'application/octet-stream',
        encoding: 'base64',
        content: `${'AAAA'.repeat(1_398_101)}AA==`,
        sizeBytes: 4_194_304,
      },
    },
  })
  await expect(largeBinary).resolves.toMatchObject({
    path: 'large-image.bin',
    encoding: 'base64',
    sizeBytes: 4_194_304,
  })
  const decode = vi.spyOn(globalThis, 'atob')
  try {
    const underdeclared = files.read('underdeclared.bin', 3)
    runner.reply({
      type: 'file.read.result',
      requestId: 'request-5',
      result: {
        ok: true,
        file: {
          path: 'underdeclared.bin',
          mediaType: 'application/octet-stream',
          encoding: 'base64',
          content: 'AAAA'.repeat(100_000),
          sizeBytes: 1,
        },
      },
    })
    await expect(underdeclared).rejects.toMatchObject({
      status: 413,
      sizeBytes: 300_000,
      limitBytes: 3,
    })
    expect(decode.mock.calls.length).toBe(0)
  } finally {
    decode.mockRestore()
  }
})

it('rejects pending reads on disconnect and cleans up aborted requests', async () => {
  const { files, runner } = await connectFilesRunner()
  const controller = new AbortController()
  const cancelled = files.read('file.txt', 8, controller.signal)
  controller.abort()
  await expect(cancelled).rejects.toMatchObject({
    code: 'file_unavailable',
    status: 503,
  })
  expect(
    files.receive('connection-1', {
      ...recordedFileResponses[0],
      requestId: 'request-1',
    }),
  ).toBe(false)
  const read = files.read('file.txt', 8)
  const diff = files.diff('file.txt', 'trunk')
  runner.disconnect()
  await expect(read).rejects.toMatchObject({
    code: 'file_unavailable',
    status: 503,
  })
  await expect(diff).rejects.toMatchObject({
    code: 'file_unavailable',
    status: 503,
  })
  expect(files.read('file.txt', 8)).toBe(null)
  expect(files.diff('file.txt', 'trunk')).toBe(null)
})

it('rejects mismatched file content and diff bases without copying runner errors', async () => {
  const { files, runner } = await connectFilesRunner()
  const read = files.read('requested.txt', 32)
  runner.reply({
    type: 'file.read.result',
    requestId: 'request-1',
    result: {
      ok: true,
      file: {
        path: 'other.txt',
        mediaType: 'text/plain',
        sizeBytes: 1,
        encoding: 'utf-8',
        content: 'x',
      },
    },
  })
  await expect(read).rejects.toMatchObject({
    status: 502,
    code: 'file_unavailable',
  })
  const diff = files.diff('file.txt', 'trunk')
  runner.reply({
    type: 'file.diff.result',
    requestId: 'request-2',
    result: {
      ok: true,
      diff: {
        path: 'file.txt',
        baseBranch: 'main',
        oldContent: '',
        newContent: '',
        patch: '',
        binary: false,
      },
    },
  })
  await expect(diff).rejects.toMatchObject({
    status: 502,
    code: 'file_unavailable',
  })
  const missing = files.read('missing.txt', 32)
  runner.reply({
    type: 'file.read.result',
    requestId: 'request-3',
    result: {
      ok: false,
      error: {
        code: 'file_not_found',
        message: 'private credential in upstream error',
      },
    },
  })
  await expect(missing).rejects.toMatchObject({
    status: 404,
    code: 'file_not_found',
    message: 'The file is not available.',
  })
})

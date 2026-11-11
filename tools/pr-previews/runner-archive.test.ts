import { afterEach, expect, it, vi } from 'vitest'
import {
  apiReply,
  commandReply,
  fakeContext,
} from './operations.test-support.ts'
import { publishRunner } from './runner-archive.ts'

const files = vi.hoisted(() => ({
  stat: vi.fn<() => Promise<{ size: number }>>(),
}))
vi.mock('node:fs/promises', () => files)
afterEach(() => vi.resetAllMocks())

const archive = {
  url: 'https://runner.preview.example/runner-test.tar.gz',
  sha256: 'a'.repeat(64),
  path: '/artifact/runner.tar.gz',
}

it('publishes a missing runner with S3 token fallback and verifies its public size', async () => {
  const { ctx, command, http } = fakeContext()
  ctx.settings.apiToken = 'abc'
  files.stat.mockResolvedValue({ size: 123 })
  http
    .mockResolvedValueOnce(new Response(null, { status: 403 }))
    .mockResolvedValueOnce(apiReply({ id: 'fake-token-id' }))
    .mockResolvedValueOnce(
      new Response(null, { headers: { 'Content-Length': '123' } }),
    )
  command
    .mockResolvedValueOnce({
      exitCode: 1,
      stdout: '',
      stderr: '(404) Not Found',
    })
    .mockResolvedValueOnce(commandReply({}))
  await expect(publishRunner(ctx, archive)).resolves.toBe('uploaded')
  expect(command.mock.calls.map(([request]) => request.args)).toEqual([
    [
      's3api',
      'head-object',
      '--bucket',
      'conductive-preview-runner',
      '--key',
      'runner-test.tar.gz',
      '--endpoint-url',
      'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
    ],
    [
      's3',
      'cp',
      '/artifact/runner.tar.gz',
      's3://conductive-preview-runner/runner-test.tar.gz',
      '--content-type',
      'application/gzip',
      '--only-show-errors',
      '--endpoint-url',
      'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
    ],
  ])
  for (const [request] of command.mock.calls) {
    expect(request.env.AWS_ACCESS_KEY_ID).toBe('fake-token-id')
    expect(request.env.AWS_SECRET_ACCESS_KEY).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(request.env.AWS_REQUEST_CHECKSUM_CALCULATION).toBe('when_required')
    expect(request.env.AWS_RESPONSE_CHECKSUM_VALIDATION).toBe('when_required')
    expect(request.env.CLOUDFLARE_API_TOKEN).toBeUndefined()
    expect(request.args.join(' ')).not.toContain('fake-token-id')
  }
  const publicRequest = http.mock.calls[2][0]
  expect(publicRequest.method).toBe('HEAD')
  expect(publicRequest.headers.get('Authorization')).toBeNull()
})

it('reuses an existing runner but rejects a different public size', async () => {
  const { ctx, command, http } = fakeContext()
  http
    .mockResolvedValueOnce(apiReply({ id: 'fake-token-id' }))
    .mockResolvedValueOnce(
      new Response(null, { headers: { 'Content-Length': '122' } }),
    )
  command.mockResolvedValueOnce(commandReply({ ContentLength: 123 }))
  await expect(
    publishRunner(ctx, { url: archive.url, sha256: archive.sha256 }),
  ).rejects.toThrowError(
    'Public runner archive size does not match the stored archive.',
  )
  expect(command).toHaveBeenCalledTimes(1)
  expect(files.stat).not.toHaveBeenCalled()
})

it('does not upload a runner when the object check is denied', async () => {
  const { ctx, command, http } = fakeContext()
  http.mockResolvedValueOnce(apiReply({ id: 'fake-token-id' }))
  command.mockResolvedValueOnce({
    exitCode: 1,
    stdout: '',
    stderr: '(403) AccessDenied fake-sensitive-data',
  })
  await expect(publishRunner(ctx, archive)).rejects.toThrowError(
    'R2 object metadata request failed.',
  )
  expect(command).toHaveBeenCalledTimes(1)
})

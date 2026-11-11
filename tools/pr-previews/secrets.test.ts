import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { afterEach, expect, it, vi } from 'vitest'
import { writeRelaySecretsFile, writeSecretsFile } from './secrets.ts'

vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn(),
  writeFile: vi.fn(),
  rm: vi.fn(),
}))
vi.mock('node:os', () => ({ tmpdir: () => '/system-temp' }))
afterEach(() => vi.resetAllMocks())

const secrets = {
  GITHUB_CLIENT_SECRET: 'fake-client-secret',
  GITHUB_APP_PRIVATE_KEY: 'fake-private-key\nsecond line\n',
  GITHUB_WEBHOOK_SECRET: 'fake-webhook-secret',
  SESSION_SIGNING_KEY: 'fake-signing-key',
  BOAT_KEY_ENCRYPTION_KEY: 'fake-encryption-key',
  BOAT_API_KEY: 'fake-boat-key',
}

it('writes only six secrets in a new runner folder with mode 0600 and provides cleanup', async () => {
  vi.mocked(mkdtemp).mockResolvedValue('/runner-temp/conductive-preview-abc')
  const input = { ...secrets, CLOUDFLARE_API_TOKEN: 'fake-do-not-write-token' }
  const file = await writeSecretsFile(input, { RUNNER_TEMP: '/runner-temp' })
  expect(file.path).toBe('/runner-temp/conductive-preview-abc/secrets.json')
  expect(mkdtemp).toHaveBeenCalledExactlyOnceWith(
    '/runner-temp/conductive-preview-',
  )
  expect(writeFile).toHaveBeenCalledExactlyOnceWith(
    '/runner-temp/conductive-preview-abc/secrets.json',
    JSON.stringify(secrets),
    { encoding: 'utf8', mode: 0o600, flag: 'wx' },
  )
  await file.cleanup()
  expect(rm).toHaveBeenCalledExactlyOnceWith(
    '/runner-temp/conductive-preview-abc',
    { recursive: true, force: true },
  )
})

it('uses the OS temporary folder when RUNNER_TEMP is absent', async () => {
  vi.mocked(mkdtemp).mockResolvedValue('/system-temp/conductive-preview-def')
  const file = await writeSecretsFile(secrets, {})
  expect(file.path).toBe('/system-temp/conductive-preview-def/secrets.json')
  expect(mkdtemp).toHaveBeenCalledExactlyOnceWith(
    '/system-temp/conductive-preview-',
  )
  await file.cleanup()
})

it('removes a partial secrets file after a write failure without exposing the cause', async () => {
  vi.mocked(mkdtemp).mockResolvedValue('/runner-temp/conductive-preview-ghi')
  vi.mocked(writeFile).mockRejectedValue(new Error('fake-secret-must-not-log'))
  await expect(
    writeSecretsFile(secrets, { RUNNER_TEMP: '/runner-temp' }),
  ).rejects.toThrowError('Could not write the preview secrets file.')
  expect(rm).toHaveBeenCalledExactlyOnceWith(
    '/runner-temp/conductive-preview-ghi',
    { recursive: true, force: true },
  )
})

it('writes only the webhook secret for a relay with mode 0600 and cleanup', async () => {
  vi.mocked(mkdtemp).mockResolvedValue('/runner-temp/conductive-preview-relay')
  const file = await writeRelaySecretsFile('fake-relay-secret', {
    RUNNER_TEMP: '/runner-temp',
  })
  expect(file.path).toBe('/runner-temp/conductive-preview-relay/secrets.json')
  expect(writeFile).toHaveBeenCalledExactlyOnceWith(
    file.path,
    '{"GITHUB_WEBHOOK_SECRET":"fake-relay-secret"}',
    { encoding: 'utf8', mode: 0o600, flag: 'wx' },
  )
  await file.cleanup()
  expect(rm).toHaveBeenCalledExactlyOnceWith(
    '/runner-temp/conductive-preview-relay',
    { recursive: true, force: true },
  )
})

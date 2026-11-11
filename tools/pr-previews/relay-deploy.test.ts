import { afterEach, expect, it, vi } from 'vitest'
import { apiReply, fakeContext } from './operations.test-support.ts'
import { deployRelay } from './relay-deploy.ts'

const files = vi.hoisted(() => ({
  readFile: vi.fn<(...args: unknown[]) => Promise<string>>(),
  writeFile: vi.fn<(...args: unknown[]) => Promise<void>>(),
  mkdtemp: vi.fn<(...args: unknown[]) => Promise<string>>(),
  rm: vi.fn<(...args: unknown[]) => Promise<void>>(),
}))
vi.mock('node:fs/promises', () => files)
afterEach(() => vi.resetAllMocks())

function relayDeployment(fails = false) {
  const fake = fakeContext()
  const trace: string[] = []
  files.readFile.mockResolvedValue(
    '// source config\n{\n  "compatibility_date": "2026-10-01",\n}\n',
  )
  files.mkdtemp.mockResolvedValue('/runner-temp/relay-secrets')
  files.writeFile.mockImplementation(async (path) => {
    trace.push(String(path).endsWith('secrets.json') ? 'secrets' : 'config')
  })
  files.rm.mockImplementation(async () => {
    trace.push('cleanup')
  })
  fake.command.mockImplementation(async () => {
    trace.push('deploy')
    return {
      exitCode: fails ? 1 : 0,
      stdout: '',
      stderr: 'fake-sensitive-child-output',
    }
  })
  let health = 0
  fake.http.mockImplementation(async (request) => {
    if (new URL(request.url).hostname === 'api.cloudflare.com') {
      trace.push('registry')
      return apiReply([
        { id: 'registry-id', title: 'conductive-preview-registry' },
      ])
    }
    trace.push('health')
    return new Response(null, { status: health++ === 0 ? 503 : 200 })
  })
  return { ...fake, trace }
}

it('deploys the relay with the root compatibility date and only its secret, then checks the bare zone', async () => {
  const { ctx, trace, command, http, pause } = relayDeployment()
  await expect(deployRelay(ctx)).resolves.toBe('https://preview.example/')
  expect(trace).toEqual([
    'registry',
    'config',
    'secrets',
    'deploy',
    'cleanup',
    'health',
    'health',
  ])
  expect(command.mock.calls[0][0].args).toEqual([
    'deploy',
    '--config',
    '/artifact/relay.wrangler.json',
    '--secrets-file',
    '/runner-temp/relay-secrets/secrets.json',
  ])
  const config: unknown = JSON.parse(String(files.writeFile.mock.calls[0][1]))
  expect(config).toMatchObject({
    compatibility_date: '2026-10-01',
    kv_namespaces: [{ binding: 'PREVIEWS', id: 'registry-id' }],
  })
  expect(files.writeFile.mock.calls[1][1]).toBe(
    '{"GITHUB_WEBHOOK_SECRET":"fake-webhook-secret"}',
  )
  expect(http.mock.calls.slice(-2).map(([request]) => request.url)).toEqual([
    'https://preview.example/',
    'https://preview.example/',
  ])
  expect(pause).toHaveBeenCalledExactlyOnceWith(5000)
})

it('removes the relay secret file after a failed deploy and does not run health', async () => {
  const { ctx, trace } = relayDeployment(true)
  await expect(deployRelay(ctx)).rejects.toThrowError(
    'Wrangler deploy failed with exit code 1.',
  )
  expect(trace).toEqual(['registry', 'config', 'secrets', 'deploy', 'cleanup'])
  expect(files.rm).toHaveBeenCalledExactlyOnceWith(
    '/runner-temp/relay-secrets',
    { recursive: true, force: true },
  )
})

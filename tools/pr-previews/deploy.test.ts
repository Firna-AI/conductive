import { afterEach, expect, it, vi } from 'vitest'
import { writePreviewConfig } from './config.ts'
import { deployPreview } from './deploy.ts'
import { scenario, type ScenarioOptions } from './scenario.test-support.ts'
import { writeSecretsFile } from './secrets.ts'

const files = vi.hoisted(() => ({
  readdir: vi.fn<() => Promise<string[]>>(),
  readFile: vi.fn<() => Promise<string>>(),
  stat: vi.fn<() => Promise<{ size: number }>>(),
}))
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readdir: (...args: Parameters<typeof actual.readdir>) =>
      args[0] === '/artifact/migrations'
        ? files.readdir()
        : actual.readdir(...args),
    readFile: (...args: Parameters<typeof actual.readFile>) =>
      String(args[0]).startsWith('/artifact/migrations/')
        ? files.readFile()
        : actual.readFile(...args),
    stat: (...args: Parameters<typeof actual.stat>) =>
      args[0] === '/artifact/runner.tar.gz'
        ? files.stat()
        : actual.stat(...args),
  }
})
vi.mock('./config.ts', () => ({ writePreviewConfig: vi.fn() }))
vi.mock('./secrets.ts', () => ({ writeSecretsFile: vi.fn() }))
afterEach(() => vi.resetAllMocks())

const inputs = {
  number: 123,
  buildFolder: '/artifact',
  sha: 'a'.repeat(40),
  runner: {
    url: 'https://runner.preview.example/runner-test.tar.gz',
    sha256: 'b'.repeat(64),
    path: '/artifact/runner.tar.gz',
  },
}

function deployment(options: ScenarioOptions = {}) {
  const fake = scenario(options)
  files.readdir.mockResolvedValue(['README.md', '001.sql'])
  files.readFile.mockResolvedValue('')
  files.stat.mockResolvedValue({ size: 123 })
  vi.mocked(writePreviewConfig).mockImplementation(async () => {
    fake.trace.push('config:write')
    return '/artifact/dist/conductive/wrangler.pr-123.json'
  })
  vi.mocked(writeSecretsFile).mockImplementation(async () => {
    fake.trace.push('secrets:write')
    return {
      path: '/runner-temp/private/secrets.json',
      cleanup: async () => {
        fake.trace.push('secrets:cleanup')
      },
    }
  })
  return fake
}

it('deploys in order from a new database through migration hashes, runner, health, and registry', async () => {
  const { ctx, command, trace } = deployment({ archiveMissing: true })
  await expect(deployPreview(ctx, inputs)).resolves.toEqual({
    marketingUrl: 'https://pr-123.preview.example',
    appUrl: 'https://pr-123-app.preview.example',
    dataReset: false,
    registryRegistered: true,
  })
  expect(trace).toEqual([
    'database:list',
    'database:create',
    'database:info',
    'config:write',
    'migrations:apply',
    'migrations:record',
    'storage:auth',
    'runner:head',
    'runner:upload',
    'runner:public-size',
    'secrets:write',
    'worker:deploy',
    'secrets:cleanup',
    'health:check',
    'registry:find',
    'registry:add',
  ])
  const statements = command.mock.calls.map(([request]) =>
    request.args.join(' '),
  )
  expect(statements.join('\n')).toContain(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  expect(statements).toContain(
    'deploy --config /artifact/dist/conductive/wrangler.pr-123.json --secrets-file /runner-temp/private/secrets.json --tag aaaaaaa --message PR 123 at aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  )
})

it.each(['001.sql', 'removed.sql'])(
  'resets data after cleanup when recorded migration %s changed or disappeared',
  async (name) => {
    const { ctx, trace } = deployment({
      database: true,
      recorded: [{ name, sha256: 'old-digest' }],
    })
    const result = await deployPreview(ctx, inputs)
    expect(result.dataReset).toBe(true)
    expect(trace.slice(0, trace.indexOf('config:write'))).toEqual([
      'database:list',
      'migrations:table',
      'migrations:read',
      'resources:known-tables',
      'resources:orgs',
      'resources:tables',
      'resources:snapshots',
      'resources:builds',
      'sandbox:list',
      'sandbox:delete:box-a',
      'sandbox:list',
      'sandbox:delete:box-b',
      'snapshot:delete:stored-snapshot',
      'snapshot:delete:image-me',
      'storage:auth',
      'attachments:delete',
      'database:delete',
      'database:create',
      'database:info',
    ])
    expect(vi.mocked(writePreviewConfig).mock.calls[0][1].databaseId).toBe(
      'new-database-id',
    )
  },
)

it('removes the secrets file after a failed deploy and stops before health or registration', async () => {
  const { ctx, trace } = deployment({ deployFailure: true })
  await expect(deployPreview(ctx, inputs)).rejects.toThrowError(
    'Wrangler deploy failed with exit code 1.',
  )
  expect(trace.slice(-3)).toEqual([
    'secrets:write',
    'worker:deploy',
    'secrets:cleanup',
  ])
  expect(trace).not.toContain('health:check')
  expect(trace).not.toContain('registry:add')
})

it('records only applied migration hashes after a partial migration failure', async () => {
  const { ctx, trace, command } = deployment({ migrationFailure: true })
  files.readdir.mockResolvedValue(['001.sql', '002.sql'])
  await expect(deployPreview(ctx, inputs)).rejects.toThrowError(
    'Wrangler d1 migrations failed with exit code 1.',
  )
  expect(trace.slice(-4)).toEqual([
    'migrations:apply',
    'migrations:applied-table',
    'migrations:applied',
    'migrations:record',
  ])
  const record = command.mock.calls
    .map(([request]) => request.args.join(' '))
    .find((args) =>
      args.includes('CREATE TABLE IF NOT EXISTS conductive_preview_migrations'),
    )
  expect(record).toContain(
    "VALUES ('001.sql', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')",
  )
  expect(record).not.toContain('002.sql')
  expect(trace).not.toContain('runner:head')
})

it('retains the reset status when recreating a deleted database fails', async () => {
  const { ctx, trace } = deployment({
    database: true,
    recorded: [{ name: '001.sql', sha256: 'old-digest' }],
    createFailure: true,
  })
  await expect(deployPreview(ctx, inputs)).rejects.toMatchObject({
    message: 'Wrangler d1 create failed with exit code 1.',
    output: {
      marketingUrl: 'https://pr-123.preview.example',
      appUrl: 'https://pr-123-app.preview.example',
      dataReset: true,
    },
  })
  expect(trace.slice(-2)).toEqual(['database:delete', 'database:create'])
})

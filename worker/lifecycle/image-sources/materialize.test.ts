import { generateKeyPairSync } from 'node:crypto'

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { repositoryDirectory, shellQuote } from '../commands'
import { createGitHubImageSourceMaterializer } from './materialize'
import { INSTALLATION_TOKEN } from './test-data'
import { sourceFixture, transferredPack, transferredTags } from './test-support'

let harness: TestHarness
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privateKey = keys.privateKey
  .export({ type: 'pkcs1', format: 'pem' })
  .toString()
const FAILURE = {
  status: 502,
  code: 'image_sources_unavailable',
  message:
    'The repositories could not load. Check the GitHub App access and try again.',
}

beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})
beforeEach(async () => {
  await harness.reset()
  vi.spyOn(Date, 'now').mockReturnValue(TEST_TIME)
})
afterEach(() => {
  vi.restoreAllMocks()
})

it('streams complete default history to the authorized builder without credentials', async () => {
  const fixture = await sourceFixture(harness, privateKey)
  await expect(
    createGitHubImageSourceMaterializer(fixture.env, {
      fetch: fixture.fetch,
    })(fixture.input),
  ).resolves.toBeUndefined()
  expect(
    fixture.requests.map((request) => [
      request.method,
      request.url,
      request.redirect,
    ]),
  ).toEqual([
    [
      'POST',
      'https://api.github.com/app/installations/701/access_tokens',
      'manual',
    ],
    [
      'GET',
      'https://github.com/example/source-repository.git/info/refs?service=git-upload-pack',
      'manual',
    ],
    [
      'POST',
      'https://github.com/example/source-repository.git/git-upload-pack',
      'manual',
    ],
  ])
  expect(await fixture.requests[0].json()).toEqual({
    repository_ids: [101],
    permissions: { contents: 'read' },
  })
  const jwt = fixture.requests[0].headers
    .get('Authorization')
    ?.slice(7)
    .split('.')
  expect(jwt?.length).toBe(3)
  const [header, claims, signature] = jwt ?? []
  expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({
    alg: 'RS256',
    typ: 'JWT',
  })
  expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({
    iss: 'github-client-id',
    iat: 1_799_999_940,
    exp: 1_800_000_540,
  })
  const publicKey = await crypto.subtle.importKey(
    'spki',
    keys.publicKey.export({ type: 'spki', format: 'der' }),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  expect(
    await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      Buffer.from(signature, 'base64url'),
      Buffer.from(`${header}.${claims}`),
    ),
  ).toBe(true)
  expect(
    fixture.requests
      .slice(1)
      .map((request) => request.headers.get('Authorization')),
  ).toEqual([
    `Basic ${btoa(`x-access-token:${INSTALLATION_TOKEN}`)}`,
    `Basic ${btoa(`x-access-token:${INSTALLATION_TOKEN}`)}`,
  ])
  const commands = await fixture.commands()
  expect(await fixture.requests[2].text()).toContain('include-tag')
  expect(transferredTags(commands)).toEqual(fixture.tagMetadata)
  expect(
    commands.filter(
      (command) =>
        command.includes('base64 -d >>') &&
        command.includes('conducting-image-source.tags'),
    ),
  ).toHaveLength(2)
  expect(commands.join('\n')).toContain('cat-file --batch-check')
  expect(commands.join('\n')).toContain('update-ref --stdin')
  expect(transferredPack(commands)).toEqual(fixture.pack.bytes)
  expect(
    commands.filter(
      (command) =>
        command.includes('base64 -d >>') &&
        command.includes('conducting-image-source.pack'),
    ),
  ).toHaveLength(2)
  expect(commands.join('\n')).toContain(
    shellQuote(repositoryDirectory(fixture.repository.id)),
  )
  expect(commands.join('\n')).toContain('index-pack --stdin')
  expect(commands.join('\n')).toContain('checkout --force -B')
  expect(commands.join('\n')).toContain(fixture.pack.oid)
  expect(commands.join('\n')).toContain(
    'https://github.com/example/source-repository.git',
  )
  for (const secret of [
    INSTALLATION_TOKEN,
    privateKey,
    'boat-first',
    'github-client-secret',
    'WORKSPACE_TOKEN',
  ]) {
    expect(commands.join('\n')).not.toContain(secret)
  }
})

it('refreshes captured repositories after the current selection changes', async () => {
  const fixture = await sourceFixture(harness, privateKey)
  await harness.env.DB.prepare('UPDATE repositories SET selected = 0').run()
  await harness.env.DB.prepare("UPDATE image_builds SET kind = 'refresh'").run()
  await expect(
    createGitHubImageSourceMaterializer(fixture.env, { fetch: fixture.fetch })(
      fixture.input,
    ),
  ).resolves.toBeUndefined()
  expect(transferredPack(await fixture.commands())).toEqual(fixture.pack.bytes)
})

it('refuses other orgs, stale repository metadata, and a different builder before transfer', async () => {
  const fixture = await sourceFixture(harness, privateKey)
  const materialize = createGitHubImageSourceMaterializer(fixture.env, {
    fetch: fixture.fetch,
  })
  const invalid = [
    { ...fixture.input, orgId: 'another-org' },
    { ...fixture.input, buildId: 'another-build' },
    { ...fixture.input, sandboxId: 'another-builder' },
    {
      ...fixture.input,
      repositories: [{ ...fixture.repository, orgId: 'another-org' }],
    },
    {
      ...fixture.input,
      repositories: [
        { ...fixture.repository, fullName: 'example/another-repository' },
      ],
    },
    {
      ...fixture.input,
      repositories: [
        { ...fixture.repository, defaultBranch: 'different-default' },
      ],
    },
  ]
  for (const input of invalid)
    await expect(materialize(input)).rejects.toMatchObject(FAILURE)
  expect(fixture.requests).toHaveLength(0)
  expect(await fixture.commands()).toEqual([])
})

it('redacts GitHub and provider failures and rejects incomplete Git data', async () => {
  const fixture = await sourceFixture(harness, privateKey)
  const materialize = createGitHubImageSourceMaterializer(fixture.env, {
    fetch: fixture.fetch,
  })
  fixture.options.tokenFailure = true
  await expect(materialize(fixture.input)).rejects.toMatchObject(FAILURE)
  fixture.options.tokenFailure = false
  fixture.options.corrupt = true
  await expect(materialize(fixture.input)).rejects.toMatchObject(FAILURE)
  fixture.options.corrupt = false
  fixture.options.sidebandFailure = true
  await expect(materialize(fixture.input)).rejects.toMatchObject(FAILURE)
  fixture.options.sidebandFailure = false
  harness.boat.responseOverride = Response.json({
    ok: true,
    type: 'command.finished',
    exitCode: 1,
    stdout: INSTALLATION_TOKEN,
    stderr: INSTALLATION_TOKEN,
    timedOut: false,
  })
  await expect(materialize(fixture.input)).rejects.toMatchObject(FAILURE)
  expect((await fixture.commands()).join('\n')).not.toContain(
    INSTALLATION_TOKEN,
  )
})

it('initializes an empty repository without requesting a Git pack', async () => {
  const fixture = await sourceFixture(harness, privateKey)
  fixture.options.empty = true
  await createGitHubImageSourceMaterializer(fixture.env, {
    fetch: fixture.fetch,
  })(fixture.input)
  expect(fixture.requests.map((request) => request.method)).toEqual([
    'POST',
    'GET',
  ])
  const commands = await fixture.commands()
  expect(transferredPack(commands)).toEqual(new Uint8Array(0))
  expect(commands.join('\n')).toContain('symbolic-ref HEAD')
  expect(commands.join('\n')).not.toContain('index-pack --stdin')
})

it('transfers raw pack data when Git does not offer sidebands', async () => {
  const fixture = await sourceFixture(harness, privateKey)
  fixture.options.sideband = false
  await createGitHubImageSourceMaterializer(fixture.env, {
    fetch: fixture.fetch,
  })(fixture.input)
  expect(await fixture.requests[2].text()).not.toContain('side-band')
  expect(transferredPack(await fixture.commands())).toEqual(fixture.pack.bytes)
})

it('reports a missing App private key without touching the builder', async () => {
  const fixture = await sourceFixture(harness, privateKey)
  await expect(
    createGitHubImageSourceMaterializer(
      { ...fixture.env, GITHUB_APP_PRIVATE_KEY: undefined },
      { fetch: fixture.fetch },
    )(fixture.input),
  ).rejects.toMatchObject({
    status: 503,
    code: 'image_sources_unavailable',
    message:
      'The repositories could not load. Ask the app operator to set the GitHub App private key.',
  })
  expect(fixture.requests).toHaveLength(0)
  expect(await fixture.commands()).toEqual([])
})

import { generateKeyPairSync } from 'node:crypto'
import { access } from 'node:fs/promises'

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { ProviderError } from '../../sandbox/errors'
import { localSourceFixture } from './local-source-test-support'
import { createGitHubImageSourceMaterializer } from './materialize'
import { INSTALLATION_TOKEN } from './native-github-test-support'
import { readSourceJob } from './source-data'

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
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('redacts denied installation access before starting native Git', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    fixture.access.tokenFailure = true
    await expect(fixture.finish()).rejects.toMatchObject(FAILURE)
    expect(
      fixture.access.requests.map((request) => [
        request.method,
        request.redirect,
      ]),
    ).toEqual([['POST', 'manual']])
    expect(fixture.access.activeTokens).toEqual([])
    expect(fixture.provider.commands).toHaveLength(1)
    expect(fixture.provider.commands.join('\n')).not.toContain(
      INSTALLATION_TOKEN,
    )
    expect(
      await readSourceJob(fixture.env.DB, fixture.input.buildId),
    ).toBeNull()
    expect(
      (
        await fixture.env.DB.prepare('SELECT text FROM image_build_logs').all<{
          text: string
        }>()
      ).results,
    ).toEqual([{ text: 'Updating the repositories.\n' }])
  } finally {
    await fixture.dispose()
  }
})

it('refuses wrong orgs, stale captured metadata, and a different build before any command or token', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    const materialize = createGitHubImageSourceMaterializer(fixture.env, {
      fetch: fixture.access.fetch,
      now: () => TEST_TIME,
    })
    for (const input of [
      { ...fixture.input, orgId: 'another-org' },
      { ...fixture.input, buildId: 'another-build' },
      { ...fixture.input, sandboxId: 'another-builder' },
      ...[
        { orgId: 'another-org' },
        { fullName: 'example/another-repository' },
        { defaultBranch: 'different-default' },
      ].map((change) => ({
        ...fixture.input,
        repositories: [{ ...fixture.repository, ...change }],
      })),
    ])
      await expect(materialize(input)).rejects.toMatchObject(FAILURE)
    await expect(
      createGitHubImageSourceMaterializer(
        { ...fixture.env, GITHUB_APP_PRIVATE_KEY: undefined },
        { fetch: fixture.access.fetch, now: () => TEST_TIME },
      )(fixture.input),
    ).rejects.toMatchObject({
      status: 503,
      code: 'image_sources_unavailable',
      message:
        'The repositories could not load. Ask the app operator to set the GitHub App private key.',
    })
    expect(fixture.access.requests).toEqual([])
    expect(fixture.provider.commands).toEqual([])
  } finally {
    await fixture.dispose()
  }
})

it('revokes a failed native clone and keeps raw credential-bearing failures out of the log', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    fixture.github.readFailure = 'denied'
    fixture.provider.reportedError = INSTALLATION_TOKEN
    await expect(fixture.finish()).rejects.toMatchObject(FAILURE)
    expect(fixture.access.requests.map((request) => request.method)).toEqual([
      'POST',
      'GET',
      'DELETE',
      'POST',
      'DELETE',
    ])
    expect(fixture.access.activeTokens).toEqual([])
    expect(fixture.access.events).not.toContain('finalize')
    expect(
      fixture.provider.results.map((result) => [result.stdout, result.stderr]),
    ).toEqual([
      [expect.stringMatching(/^MemAvailable:\s+\d+ kB\n$/u), ''],
      ['', ''],
    ])
    expect(
      (
        await fixture.env.DB.prepare('SELECT text FROM image_build_logs').all<{
          text: string
        }>()
      ).results,
    ).toEqual([
      { text: 'Updating the repositories.\n' },
      { text: 'Repository copy complete.\n' },
    ])
    expect(fixture.provider.commands.join('\n')).not.toContain(
      INSTALLATION_TOKEN,
    )
  } finally {
    await fixture.dispose()
  }
})

it('retains encrypted revocation ownership across actor restarts and blocks checkout until GitHub proves inactivity', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    await fixture.step()
    await fixture.step()
    await fixture.step()
    fixture.access.revokeFailures = 2
    expect(await fixture.step()).toBe(false)
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))?.phase,
    ).toBe('revoke')
    expect(await fixture.prepare()).toBe(false)
    expect(fixture.provider.commands).toHaveLength(2)
    expect(fixture.access.activeTokens).toEqual([`${INSTALLATION_TOKEN}_2`])
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))
        ?.tokenCiphertext,
    ).toMatch(/^v1\./u)
    await expect(access(fixture.directory)).rejects.toMatchObject({
      code: 'ENOENT',
    })
    fixture.access.loseRevokeReply = true
    expect(await fixture.prepare()).toBe(false)
    expect(fixture.access.activeTokens).toEqual([])
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))
        ?.tokenCiphertext,
    ).toMatch(/^v1\./u)
    expect(await fixture.prepare()).toBe(false)
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))
        ?.tokenCiphertext,
    ).toBeNull()
    expect(fixture.provider.commands).toHaveLength(2)
    await fixture.finish()
    expect(fixture.access.requests.map((request) => request.method)).toEqual([
      'POST',
      'GET',
      'DELETE',
      'POST',
      'DELETE',
      'DELETE',
      'DELETE',
      'DELETE',
    ])
  } finally {
    await fixture.dispose()
  }
})

it('fails closed after an uncertain native start and revokes the retained token on the next actor', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    await fixture.step()
    await fixture.step()
    fixture.provider.loseStartReply = new ProviderError('unavailable', 503)
    fixture.provider.beforeStart = async (command) => {
      if (command.includes('clone --bare')) fixture.access.revokeFailures = 1
    }
    await expect(fixture.prepare()).resolves.toBe(false)
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))?.phase,
    ).toBe('abort')
    expect(fixture.access.activeTokens).toEqual([`${INSTALLATION_TOKEN}_2`])
    await expect(fixture.prepare()).rejects.toMatchObject(FAILURE)
    expect(fixture.access.activeTokens).toEqual([])
    expect(fixture.provider.commands).toHaveLength(2)
    expect(fixture.access.events).not.toContain('finalize')
  } finally {
    await fixture.dispose()
  }
})

it('revokes a token when its native process is lost without running checkout', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    await fixture.step()
    await fixture.step()
    await fixture.step()
    fixture.provider.lostProcess = true
    await expect(fixture.step()).rejects.toMatchObject(FAILURE)
    expect(fixture.access.activeTokens).toEqual([])
    expect(fixture.provider.commands).toHaveLength(2)
    expect(fixture.access.events).not.toContain('finalize')
  } finally {
    await fixture.dispose()
  }
})

it('refuses a nonempty remote when its captured default branch is missing', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    await fixture.remoteGit(
      'update-ref',
      'refs/heads/another-branch',
      fixture.firstOid,
    )
    await fixture.remoteGit(
      'update-ref',
      '-d',
      `refs/heads/${fixture.repository.defaultBranch}`,
    )
    await expect(fixture.finish()).rejects.toMatchObject(FAILURE)
    expect(fixture.access.activeTokens).toEqual([])
    expect(fixture.provider.commands).toHaveLength(3)
  } finally {
    await fixture.dispose()
  }
})

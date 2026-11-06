import { generateKeyPairSync } from 'node:crypto'

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../../test-support/harness'
import { createGitHubImageSourceMaterializer } from './materialize'
import {
  expectedSourceTags,
  localSourceFixture,
} from './local-source-test-support'
import { INSTALLATION_TOKEN, SOURCE_BRANCH } from './test-data'

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs1', format: 'pem' })
  .toString()
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

it('materializes the first commit and refreshes complete clean Git history locally', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    const materialize = createGitHubImageSourceMaterializer(fixture.env, {
      fetch: fixture.fetch,
    })
    expect(
      await materialize(fixture.input).then(
        () => 'prepared',
        () => 'failed',
      ),
    ).toBe('prepared')
    expect((await fixture.git('rev-parse', 'HEAD')).toString()).toBe(
      `${fixture.pack.firstOid}\n`,
    )
    expect((await fixture.git('rev-list', 'HEAD')).toString()).toBe(
      `${fixture.pack.firstOid}\n`,
    )
    expect((await fixture.git('show', 'HEAD:source.txt')).toString()).toBe(
      'Before the source refresh.\n',
    )
    expect((await fixture.git('symbolic-ref', 'HEAD')).toString()).toBe(
      `refs/heads/${SOURCE_BRANCH}\n`,
    )
    expect((await fixture.git('status', '--porcelain')).toString()).toBe('')
    expect((await fixture.git('remote', 'get-url', 'origin')).toString()).toBe(
      'https://github.com/example/source-repository.git\n',
    )
    expect(
      await fixture.git(
        'for-each-ref',
        '--format=%(refname) %(objectname)',
        'refs/tags/',
      ),
    ).toEqual(expectedSourceTags(fixture.pack, true))
    fixture.state.oid = fixture.pack.oid
    await harness.env.DB.prepare(
      "UPDATE image_builds SET kind = 'refresh'",
    ).run()
    await materialize(fixture.input)
    expect((await fixture.git('rev-parse', 'HEAD')).toString()).toBe(
      `${fixture.pack.oid}\n`,
    )
    expect((await fixture.git('rev-list', 'HEAD')).toString()).toBe(
      `${fixture.pack.oid}\n${fixture.pack.firstOid}\n`,
    )
    expect(await fixture.git('show', 'HEAD:source.txt')).toEqual(
      fixture.pack.content,
    )
    expect((await fixture.git('symbolic-ref', 'HEAD')).toString()).toBe(
      `refs/heads/${SOURCE_BRANCH}\n`,
    )
    expect((await fixture.git('status', '--porcelain')).toString()).toBe('')
    expect((await fixture.git('remote', 'get-url', 'origin')).toString()).toBe(
      'https://github.com/example/source-repository.git\n',
    )
    expect(
      (
        await fixture.git('symbolic-ref', 'refs/remotes/origin/HEAD')
      ).toString(),
    ).toBe(`refs/remotes/origin/${SOURCE_BRANCH}\n`)
    expect(
      await fixture.git(
        'for-each-ref',
        '--format=%(refname) %(objectname)',
        'refs/tags/',
      ),
    ).toEqual(expectedSourceTags(fixture.pack))
    expect(fixture.provider.mappedCommands.join('\n')).not.toContain(
      '/home/user',
    )
    expect(fixture.provider.commands.join('\n')).not.toContain(
      INSTALLATION_TOKEN,
    )
    expect(fixture.provider.commands.join('\n')).not.toContain(privateKey)
    expect(fixture.provider.commands.join('\n')).not.toContain('boat-first')
  } finally {
    await fixture.dispose()
  }
})

it('materializes an empty repository as a clean unborn branch locally', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    fixture.state.empty = true
    const materialize = createGitHubImageSourceMaterializer(fixture.env, {
      fetch: fixture.fetch,
    })
    expect(
      await materialize(fixture.input).then(
        () => 'prepared',
        () => 'failed',
      ),
    ).toBe('prepared')
    expect((await fixture.git('symbolic-ref', 'HEAD')).toString()).toBe(
      `refs/heads/${SOURCE_BRANCH}\n`,
    )
    expect((await fixture.git('for-each-ref')).toString()).toBe('')
    expect((await fixture.git('status', '--porcelain')).toString()).toBe('')
    expect((await fixture.git('remote', 'get-url', 'origin')).toString()).toBe(
      'https://github.com/example/source-repository.git\n',
    )
    expect(fixture.provider.mappedCommands.join('\n')).not.toContain(
      '/home/user',
    )
    expect(fixture.requests.map((request) => request.method)).toEqual(['POST'])
  } finally {
    await fixture.dispose()
  }
})

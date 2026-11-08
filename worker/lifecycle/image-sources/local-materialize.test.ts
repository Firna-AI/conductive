import { generateKeyPairSync } from 'node:crypto'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../../test-support/harness'
import { localSourceFixture } from './local-source-test-support'
import { INSTALLATION_TOKEN, SOURCE_BRANCH } from './native-github-test-support'

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

async function sourceFiles(directory: string | Buffer): Promise<Buffer[]> {
  const files: Buffer[] = []
  for (const entry of await readdir(directory, {
    withFileTypes: true,
    encoding: 'buffer',
  })) {
    const path = Buffer.concat([
      typeof directory === 'string' ? Buffer.from(directory) : directory,
      Buffer.from('/'),
      entry.name,
    ])
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)))
    else files.push(await readFile(path))
  }
  return files
}

it('clones default history and tags natively and refreshes captured clean folders without losing dependencies', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  try {
    const firstTags = await fixture.remoteGit(
      'for-each-ref',
      '--format=%(refname) %(objectname)',
      'refs/tags/',
    )
    await expect(fixture.finish()).resolves.toBeUndefined()
    expect((await fixture.git('rev-parse', 'HEAD')).toString()).toBe(
      `${fixture.firstOid}\n`,
    )
    expect((await fixture.git('rev-list', 'HEAD')).toString()).toBe(
      `${fixture.firstOid}\n`,
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
    ).toEqual(firstTags)
    await mkdir(join(fixture.directory, 'node_modules'))
    await fixture.write('node_modules/installed', 'installed dependencies')
    await fixture.write('source.txt', 'dirty tracked content')
    await fixture.git('config', 'credential.helper', '!exit 90')
    await fixture.git('config', 'conductive.fixture', 'kept local setting')
    await fixture.refresh()
    await expect(fixture.finish()).resolves.toBeUndefined()
    expect((await fixture.git('rev-parse', 'HEAD')).toString()).toBe(
      `${fixture.secondOid}\n`,
    )
    expect((await fixture.git('rev-list', 'HEAD')).toString()).toBe(
      `${fixture.secondOid}\n${fixture.firstOid}\n`,
    )
    expect(await fixture.git('show', 'HEAD:source.txt')).toEqual(
      fixture.content,
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
    ).toEqual(
      await fixture.remoteGit(
        'for-each-ref',
        '--format=%(refname) %(objectname)',
        'refs/tags/',
      ),
    )
    await expect(
      readFile(join(fixture.directory, 'node_modules/installed'), 'utf8'),
    ).resolves.toBe('installed dependencies')
    expect(fixture.provider.commands).toHaveLength(6)
    expect(fixture.access.requests.map((request) => request.method)).toEqual([
      'POST',
      'DELETE',
      'POST',
      'DELETE',
    ])
    expect(fixture.access.activeTokens).toEqual([])
    expect(
      fixture.access.events.filter((event) =>
        ['mint', 'claim', 'revoke', 'finalize'].includes(event),
      ),
    ).toEqual([
      'mint',
      'claim',
      'revoke',
      'finalize',
      'mint',
      'claim',
      'revoke',
      'finalize',
    ])
    expect(fixture.provider.mappedCommands.join('\n')).not.toContain(
      '/home/user',
    )
    for (const secret of [
      INSTALLATION_TOKEN,
      privateKey,
      'boat-first',
      'github-client-secret',
      'WORKSPACE_TOKEN',
    ]) {
      expect(fixture.provider.commands.join('\n')).not.toContain(secret)
      expect(await fixture.config()).not.toContain(secret)
      for (const bytes of await sourceFiles(fixture.home))
        expect(bytes.includes(Buffer.from(secret))).toBe(false)
    }
    await expect(
      fixture.git('config', '--local', '--get', 'conductive.fixture'),
    ).resolves.toEqual(Buffer.from('kept local setting\n'))
    expect(await fixture.config()).not.toContain('CONDUCTIVE_IMAGE_GIT_TOKEN')
    expect(
      fixture.provider.results.map(({ exitCode, stdout, stderr }) => ({
        exitCode,
        stdout,
        stderr,
      })),
    ).toEqual(
      Array.from({ length: 6 }, () => ({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })),
    )
  } finally {
    await fixture.dispose()
  }
})

it('clones an empty repository as a clean unborn default branch and revokes its read token', async () => {
  const fixture = await localSourceFixture(harness, privateKey, true)
  try {
    await fixture.finish()
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
    expect(fixture.access.requests.map((request) => request.method)).toEqual([
      'POST',
      'DELETE',
    ])
    expect(fixture.access.activeTokens).toEqual([])
    expect(
      fixture.github.requests.some((request) =>
        request.authorization?.startsWith('Basic '),
      ),
    ).toBe(true)
  } finally {
    await fixture.dispose()
  }
})

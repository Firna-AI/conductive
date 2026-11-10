import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { continueNativeFixture } from './continue-native.test-support'

it('isolates the member fetch from malicious working settings and preserves local files and old commits on Continue', async () => {
  const f = await continueNativeFixture()
  await f.write('old-task.txt', 'local commit\n')
  await f.git('add', 'old-task.txt')
  await f.git('commit', '--quiet', '-m', 'Unpushed task')
  const old = await f.git('rev-parse', 'HEAD')
  await f.write('carry.txt', 'uncommitted content\n')
  await f.write('staged.txt', 'staged content\n')
  await f.git('add', 'staged.txt')
  await f.write('untracked.txt', 'untracked content\n')
  await f.write('ignored.txt', 'installed content\n')
  const stolen = join(f.root, 'stolen-token')
  const hooks = join(f.root, 'hooks')
  await mkdir(hooks)
  const post = join(hooks, 'post-checkout')
  await writeFile(post, `#!/bin/sh\nenv > ${f.quote(stolen)}\n`)
  await chmod(post, 0o700)
  await f.git('config', 'core.hooksPath', hooks)
  await f.git('config', 'credential.helper', `!env > ${f.quote(stolen)}`)
  const included = join(f.root, 'included.gitconfig')
  await writeFile(
    included,
    '[credential]\n\thelper = !exit 92\n[url "https://invalid.example/"]\n\tinsteadOf = https://github.com/\n',
  )
  await f.git('config', 'include.path', included)
  const config = await f.read('.git/config')
  const fetched = await f.fetch()
  expect(fetched.exitCode, fetched.stderr).toBe(0)
  expect(f.credentialIds).toEqual(['trusted-continue-fetch'])
  expect(
    f.server.requests.some((request) =>
      request.authorization?.startsWith('Basic '),
    ),
  ).toBe(true)
  expect(f.command()).not.toContain(f.token)
  expect(await f.stageConfig()).not.toContain(f.token)
  const moved = await f.move()
  expect(moved.exitCode, moved.stderr).toBe(0)
  expect(await f.branch()).toEqual({
    exitCode: 0,
    stdout: 'owner/new\n',
    stderr: '',
    timedOut: false,
  })
  expect(await f.git('symbolic-ref', '--short', 'HEAD')).toBe('owner/new\n')
  expect(await f.git('rev-parse', 'HEAD')).toBe(`${f.latest}\n`)
  expect(await f.git('rev-parse', 'owner/old')).toBe(old)
  expect(await f.read('carry.txt')).toBe('uncommitted content\n')
  expect(await f.git('diff', '--cached', '--name-only')).toBe('staged.txt\n')
  expect(await f.read('staged.txt')).toBe('staged content\n')
  expect(await f.read('untracked.txt')).toBe('untracked content\n')
  expect(await f.read('ignored.txt')).toBe('installed content\n')
  expect(await f.read('.git/config')).toBe(config)
  await expect(readFile(stolen)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await f.work()).toEqual({
    uncommittedFiles: ['carry.txt', 'staged.txt', 'untracked.txt'],
    unpushedCommits: 1,
  })
})

it('keeps the old branch, index, and changed files when the new base clashes', async () => {
  for (const collision of ['clash.txt', 'ignored.txt'] as const) {
    const f = await continueNativeFixture(collision === 'ignored.txt')
    await f.write(collision, 'local content\n')
    await f.write('staged.txt', 'staged content\n')
    await f.git('add', 'staged.txt')
    const head = await f.git('rev-parse', 'HEAD')
    const index = await f.git('write-tree')
    expect((await f.fetch()).exitCode).toBe(0)
    expect((await f.move()).exitCode).not.toBe(0)
    expect(await f.git('symbolic-ref', '--short', 'HEAD')).toBe('owner/old\n')
    expect(await f.git('rev-parse', 'HEAD')).toBe(head)
    expect(await f.git('write-tree')).toBe(index)
    expect(await f.read(collision)).toBe('local content\n')
    expect(await f.read('staged.txt')).toBe('staged content\n')
    expect(
      await f.git('for-each-ref', '--format=%(refname)', 'refs/heads/'),
    ).toBe('refs/heads/owner/old\n')
  }
})

it('counts distinct unpushed commits across all local branches after Continue', async () => {
  const f = await continueNativeFixture()
  await f.write('common.txt', 'common\n')
  await f.git('add', '.')
  await f.git('commit', '--quiet', '-m', 'Shared unpushed ancestor')
  await f.git('branch', 'other-task')
  await f.write('first.txt', 'first\n')
  await f.git('add', '.')
  await f.git('commit', '--quiet', '-m', 'First branch only')
  await f.git('checkout', '--quiet', 'other-task')
  await f.write('second.txt', 'second\n')
  await f.git('add', '.')
  await f.git('commit', '--quiet', '-m', 'Second branch only')
  await f.git('checkout', '--quiet', 'owner/old')
  expect(await f.work()).toEqual({ uncommittedFiles: [], unpushedCommits: 3 })
  expect((await f.fetch()).exitCode).toBe(0)
  expect((await f.move()).exitCode).toBe(0)
  expect(await f.work()).toEqual({ uncommittedFiles: [], unpushedCommits: 3 })
  expect(await f.git('rev-list', '--count', 'HEAD', '--not', '--remotes')).toBe(
    '0\n',
  )
})

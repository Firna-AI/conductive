import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import {
  baseChangeFetchCommand,
  baseChangeInstallCommand,
} from './base-change-commands'
import { continueNativeFixture } from './continue-native.test-support'

it('fetches a missing merge commit before targeting the default and excludes merged feature work from Changes and diffs', async () => {
  const f = await continueNativeFixture()
  const oldMain = await f.git('rev-parse', 'origin/main')
  await f.git('checkout', '--quiet', '-b', 'feature/review')
  await f.write('feature.txt', 'merged feature\n')
  await f.git('add', 'feature.txt')
  await f.git('commit', '--quiet', '-m', 'Feature')
  await f.git('push', '--quiet', 'origin', 'feature/review')
  await f.git('checkout', '--quiet', 'owner/old')
  await f.git('merge', '--quiet', '--ff-only', 'feature/review')
  await f.write('workspace.txt', 'workspace work\n')
  await f.git('add', 'workspace.txt')
  await f.git('commit', '--quiet', '-m', 'Workspace work')
  await f.git('config', 'branch.owner/old.gh-merge-base', 'feature/review')
  await f.git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/feature/review',
  )
  await f.seedGit('fetch', '--quiet', f.directory, 'feature/review')
  await f.seedGit(
    'merge',
    '--quiet',
    '--no-ff',
    '-m',
    'Merge feature',
    'FETCH_HEAD',
  )
  await f.pushBase()
  await f.remoteGit('update-ref', '-d', 'refs/heads/feature/review')
  const merged = await f.remoteGit('rev-parse', 'refs/heads/main')
  expect(await f.git('rev-parse', 'origin/main')).toBe(oldMain)
  const head = await f.git('rev-parse', 'HEAD')
  await f.write('carry.txt', 'kept work\n')
  const source = {
    stage: join(f.root, 'base-change.git'),
    directory: f.directory,
    branch: 'owner/old',
    baseBranch: 'main',
    fetchId: 'baseChange-owner-fetch',
    fullName: f.job.binding.fullName,
  }
  const fetch = baseChangeFetchCommand(source)
  expect(await f.execute(fetch)).toMatchObject({
    exitCode: 0,
    stdout: '',
    stderr: '',
  })
  expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe(
    'feature/review\n',
  )
  expect(await f.git('rev-parse', 'origin/main')).toBe(oldMain)
  expect(f.credentialIds).toEqual(['baseChange-owner-fetch'])
  expect(await readFile(join(source.stage, 'config'), 'utf8')).not.toContain(
    f.token,
  )
  const install = baseChangeInstallCommand(source)
  expect(await f.execute(install)).toMatchObject({
    exitCode: 0,
    stdout: '',
    stderr: '',
  })
  expect(await f.git('rev-parse', 'origin/main')).toBe(merged)
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/main\n',
  )
  expect(await f.git('branch', '--show-current')).toBe('owner/old\n')
  expect(await f.git('rev-parse', 'HEAD')).toBe(head)
  expect(await f.read('carry.txt')).toBe('kept work\n')
  const base = (await f.git('merge-base', 'HEAD', 'origin/main')).trim()
  expect(base).toBe((await f.git('rev-parse', 'origin/feature/review')).trim())
  expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe('main\n')
  expect(await f.git('diff', '--name-only', base)).toBe(
    'carry.txt\nworkspace.txt\n',
  )
  expect(await f.git('show', `${base}:feature.txt`)).toBe('merged feature\n')
  expect(await f.read('feature.txt')).toBe('merged feature\n')
  expect(await f.git('diff', base, '--', 'feature.txt')).toBe('')
  expect(fetch + install).not.toContain(f.token)
  expect(await f.read('.git/config')).not.toContain(f.token)
})

it('keeps the previous target when the owner cannot fetch and refuses installation without its staged reference', async () => {
  const f = await continueNativeFixture()
  await f.git('update-ref', 'refs/remotes/origin/feature/review', 'HEAD')
  await f.git('config', 'branch.owner/old.gh-merge-base', 'feature/review')
  await f.git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/feature/review',
  )
  const original = await f.git('rev-parse', 'origin/main')
  const source = {
    stage: join(f.root, 'denied-base.git'),
    directory: f.directory,
    branch: 'owner/old',
    baseBranch: 'main',
    fetchId: 'baseChange-denied-owner',
    fullName: f.job.binding.fullName,
  }
  f.server.readFailure = 'denied'
  const fetch = await f.execute(baseChangeFetchCommand(source))
  expect(fetch.exitCode).not.toBe(0)
  expect(fetch.stdout).toBe('')
  expect(fetch.stderr).not.toContain(f.token)
  expect((await f.execute(baseChangeInstallCommand(source))).exitCode).not.toBe(
    0,
  )
  expect(await f.git('rev-parse', 'origin/main')).toBe(original)
  expect(await f.git('config', 'branch.owner/old.gh-merge-base')).toBe(
    'feature/review\n',
  )
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/feature/review\n',
  )
  f.server.readFailure = 'none'
  expect((await f.execute(baseChangeFetchCommand(source))).exitCode).toBe(0)
  expect((await f.execute(baseChangeInstallCommand(source))).exitCode).toBe(0)
  expect(await f.git('rev-parse', 'origin/main')).toBe(`${f.latest}\n`)
})

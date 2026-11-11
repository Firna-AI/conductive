import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { FileReporter } from '../../runner/src/files'
import { Repository } from '../../runner/src/repository'
import type { RunnerFileEvent } from '../../src/shared/files'
import { continueNativeFixture } from './continue-native.test-support'

it('keeps the retained reporter and diffs on the current workspace base after Continue and its default rename', async () => {
  for (const baseBranch of ['main', 'trunk']) {
    const f = await continueNativeFixture()
    await f.git('branch', 'main', 'origin/main')
    await f.git(
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main',
    )
    await f.git('config', 'branch.owner/old.gh-merge-base', 'main')
    const old = await f.git('rev-parse', 'main')
    const repository = new Repository(f.directory)
    const events: RunnerFileEvent[] = []
    const reporter = new FileReporter(repository, 'main', async (event) => {
      events.push(event)
    })
    await reporter.refresh(true)
    const beforeFetch = events.length
    await f.git('fetch', '--quiet', 'origin')
    await reporter.refresh()
    expect(events).toHaveLength(beforeFetch)
    expect(events.at(-1)).toMatchObject({
      type: 'changes.updated',
      changes: {
        baseBranch: 'main',
        summary: { files: 0, added: 0, removed: 0 },
        files: [],
      },
    })
    expect(await repository.diff('clash.txt', 'main')).toMatchObject({
      baseBranch: 'main',
      oldContent: 'original\n',
      newContent: 'original\n',
    })
    if (baseBranch === 'trunk') {
      await f.remoteGit('update-ref', 'refs/heads/trunk', f.latest)
      await f.remoteGit('update-ref', '-d', 'refs/heads/main')
      await f.remoteGit('symbolic-ref', 'HEAD', 'refs/heads/trunk')
    }
    f.job.baseBranch = baseBranch
    expect((await f.fetch()).exitCode).toBe(0)
    expect((await f.move()).exitCode).toBe(0)
    await reporter.refresh()
    expect(events.at(-1), baseBranch).toMatchObject({
      type: 'changes.updated',
      changes: {
        baseBranch,
        files: [],
        summary: { files: 0, added: 0, removed: 0 },
      },
    })
    expect(await repository.changes('main')).toMatchObject({
      baseBranch,
      files: [],
    })
    expect(await repository.diff('clash.txt', baseBranch)).toMatchObject({
      baseBranch,
      oldContent: 'new base content\n',
      newContent: 'new base content\n',
      patch: '',
    })
    expect(await f.git('rev-parse', 'main')).toBe(old)
    expect(await f.git('branch', '--show-current')).toBe('owner/new\n')
    expect(
      await f.git(
        'config',
        '--local',
        '--get-regexp',
        '^branch\\.owner/new\\.',
      ),
    ).toBe(`branch.owner/new.gh-merge-base ${baseBranch}\n`)
  }
})

it('repairs default metadata after a switched move loses its result without another checkout', async () => {
  const f = await continueNativeFixture()
  await f.git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/main',
  )
  await f.remoteGit('update-ref', 'refs/heads/trunk', f.latest)
  f.job.baseBranch = 'trunk'
  expect((await f.fetch()).exitCode).toBe(0)
  await f.write('.git/refs/remotes/origin/HEAD.lock', 'held metadata lock\n')
  await f.write('.git/config.lock', 'held target metadata lock\n')
  expect((await f.move()).exitCode).not.toBe(0)
  expect(await f.git('branch', '--show-current')).toBe('owner/new\n')
  expect((await f.branch()).exitCode).not.toBe(0)
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/main\n',
  )
  const branches = await f.git(
    'for-each-ref',
    '--format=%(refname) %(objectname)',
    'refs/heads/',
  )
  await rm(join(f.directory, '.git/refs/remotes/origin/HEAD.lock'))
  expect((await f.branch()).exitCode).not.toBe(0)
  await rm(join(f.directory, '.git/config.lock'))
  expect(await f.branch()).toEqual({
    exitCode: 0,
    stdout: 'owner/new\n',
    stderr: '',
    timedOut: false,
  })
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/trunk\n',
  )
  expect(await f.git('config', 'branch.owner/new.gh-merge-base')).toBe(
    'trunk\n',
  )
  expect(
    await f.git(
      'for-each-ref',
      '--format=%(refname) %(objectname)',
      'refs/heads/',
    ),
  ).toBe(branches)
  expect(await new Repository(f.directory).changes('main')).toMatchObject({
    baseBranch: 'trunk',
    files: [],
  })
})

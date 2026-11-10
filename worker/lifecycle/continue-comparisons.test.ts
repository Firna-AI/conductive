import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { FileReporter } from '../../runner/src/files'
import { Repository } from '../../runner/src/repository'
import type { RunnerFileEvent } from '../../src/shared/files'
import { continueNativeFixture } from './continue-native.test-support'

it('keeps the retained reporter and diffs on the fetched tip after Continue and a remote-only default rename', async () => {
  for (const baseBranch of ['main', 'trunk']) {
    const f = await continueNativeFixture()
    await f.git('branch', 'main', 'origin/main')
    await f.git(
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main',
    )
    const old = await f.git('rev-parse', 'main')
    const repository = new Repository(f.directory)
    const events: RunnerFileEvent[] = []
    const reporter = new FileReporter(repository, 'main', async (event) => {
      events.push(event)
    })
    await reporter.refresh(true)
    await f.git('fetch', '--quiet', 'origin')
    await reporter.refresh()
    expect(events.at(-1)).toMatchObject({
      type: 'changes.updated',
      changes: {
        baseBranch: 'main',
        summary: { files: 2, added: 1, removed: 2 },
        files: [
          { path: 'base.txt', change: 'deleted', added: 0, removed: 1 },
          { path: 'clash.txt', change: 'modified', added: 1, removed: 1 },
        ],
      },
    })
    expect(await repository.diff('clash.txt', 'main')).toMatchObject({
      baseBranch: 'main',
      oldContent: 'new base content\n',
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
    expect(await f.git('config', '--local', '--list')).not.toContain(
      'branch.owner/new.',
    )
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
  expect(await f.branch()).toEqual({
    exitCode: 0,
    stdout: 'owner/new\n',
    stderr: '',
    timedOut: false,
  })
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/trunk\n',
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

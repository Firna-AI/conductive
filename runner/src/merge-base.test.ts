import { expect, it } from 'vitest'

import { repositoryFixture } from '../test-support/repository'
import { Repository } from './repository'

it('keeps newer base commits out of Changes, file marks, and diffs', async () => {
  const h = await repositoryFixture()
  const repository = new Repository(h.root)
  await h.git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/main',
  )
  await h.git('branch', 'review-source')
  await h.write('README.md', 'first\nrun work\n')
  await h.git('add', 'README.md')
  await h.git('commit', '-m', 'run work')
  const runHead = (await h.git('rev-parse', 'HEAD')).trim()
  await h.git('checkout', 'review-source')
  await h.write('README.md', 'first\nnew base work\n')
  await h.write('base-only.txt', 'new base file\n')
  await h.git('add', '.')
  await h.git('commit', '-m', 'new base work')
  await h.git('checkout', 'task')
  const expected = {
    baseBranch: 'review-source',
    unpushedCommits: 1,
    uncommittedFileCount: 0,
    files: [
      {
        path: 'README.md',
        change: 'modified',
        added: 1,
        removed: 1,
        uncommitted: false,
      },
    ],
    summary: { files: 1, added: 1, removed: 1 },
  }
  expect(await repository.changes('review-source')).toEqual(expected)
  const snapshot = await repository.snapshot('review-source')
  expect(snapshot.changes).toEqual(expected)
  expect(
    snapshot.entries.find((entry) => entry.path === 'README.md')?.change,
  ).toBe('modified')
  expect(snapshot.entries.some((entry) => entry.path === 'base-only.txt')).toBe(
    false,
  )
  expect(await repository.diff('README.md', 'review-source')).toMatchObject({
    baseBranch: 'review-source',
    oldContent: 'first\nsame\n',
    newContent: 'first\nrun work\n',
    patch: expect.stringContaining('-same\n+run work\n'),
  })
  expect((await h.git('rev-parse', 'HEAD')).trim()).toBe(runHead)
  await h.git(
    'update-ref',
    'refs/remotes/origin/review-source',
    'review-source',
  )
  await h.git('branch', '-D', 'review-source')
  expect(await repository.changes('review-source')).toEqual(expected)
})

it('compares from the fetched remote base when the local base branch is behind', async () => {
  const h = await repositoryFixture()
  const repository = new Repository(h.root)
  await h.git('branch', 'review-source')
  await h.write('README.md', 'first\nremote base work\n')
  await h.write('base-only.txt', 'remote base file\n')
  await h.git('add', '.')
  await h.git('commit', '-m', 'remote base work')
  await h.git('update-ref', 'refs/remotes/origin/review-source', 'HEAD')
  await h.write('README.md', 'first\nremote base work\nrun work\n')
  await h.git('add', 'README.md')
  await h.git('commit', '-m', 'run work')
  const expected = {
    baseBranch: 'review-source',
    unpushedCommits: 1,
    uncommittedFileCount: 0,
    files: [
      {
        path: 'README.md',
        change: 'modified',
        added: 1,
        removed: 0,
        uncommitted: false,
      },
    ],
    summary: { files: 1, added: 1, removed: 0 },
  }
  expect(await repository.changes('review-source')).toEqual(expected)
  const snapshot = await repository.snapshot('review-source')
  expect(snapshot.changes).toEqual(expected)
  expect(
    snapshot.entries.find((entry) => entry.path === 'base-only.txt')?.change,
  ).toBeNull()
  expect(await repository.diff('README.md', 'review-source')).toMatchObject({
    baseBranch: 'review-source',
    oldContent: 'first\nremote base work\n',
    newContent: 'first\nremote base work\nrun work\n',
    patch: expect.stringContaining('+run work\n'),
  })
  await h.git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/main',
  )
  await h.git('config', 'branch.task.gh-merge-base', 'review-source')
  expect(await repository.changes('main')).toEqual(expected)
  expect((await repository.snapshot('main')).changes).toEqual(expected)
  expect(await repository.diff('README.md', 'main')).toMatchObject({
    baseBranch: 'review-source',
    oldContent: 'first\nremote base work\n',
  })
})

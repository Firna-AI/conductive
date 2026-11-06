import { chmod, symlink, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { gitStorage } from '../test-support/git-storage'
import { repositoryFixture } from '../test-support/repository'
import { checkpoint, changedSince } from './checkpoint'
import { Repository } from './repository'

it('compares Git link, mode, and filter representations without changing stored Git state', async () => {
  const h = await repositoryFixture()
  const repository = new Repository(h.root)
  await h.write('target.txt', 'same\n')
  await h.write('other.txt', 'same\n')
  await symlink('target.txt', join(h.root, 'link'))
  await h.git('add', 'target.txt', 'other.txt', 'link')
  await h.git('commit', '-m', 'link base')
  await h.git('update-ref', 'refs/heads/main', 'HEAD')
  let saved = await gitStorage(h.root)
  let before = await checkpoint(repository)
  await h.write('target.txt', 'target changed\n')
  expect(
    (await changedSince(repository, 'main', before)).map((file) => file.path),
  ).toEqual(['target.txt'])
  await h.write('target.txt', 'same\n')
  before = await checkpoint(repository)
  await unlink(join(h.root, 'link'))
  await symlink('other.txt', join(h.root, 'link'))
  expect(await repository.diff('link', 'main')).toMatchObject({
    oldContent: 'target.txt',
    newContent: 'other.txt',
    patch: expect.stringContaining('-target.txt\n'),
  })
  await expect(repository.diff('./link', 'main')).resolves.toMatchObject({
    path: './link',
    oldContent: 'target.txt',
    newContent: 'other.txt',
  })
  expect(
    (await changedSince(repository, 'main', before)).map((file) => file.path),
  ).toEqual(['link'])
  expect((await repository.read('link', 100)).content).toBe('same\n')
  before = await checkpoint(repository)
  await chmod(join(h.root, 'README.md'), 0o755)
  expect(await changedSince(repository, 'main', before)).toEqual([
    { path: 'README.md', change: 'modified', added: 0, removed: 0 },
  ])
  await h.git('config', 'core.fileMode', 'false')
  before = await checkpoint(repository)
  await chmod(join(h.root, 'README.md'), 0o644)
  expect(await changedSince(repository, 'main', before)).toEqual([])
  expect(await gitStorage(h.root)).toEqual(saved)

  await h.write('.gitattributes', 'filtered.txt filter=upper\n')
  await h.git('config', 'filter.upper.clean', 'tr a-z A-Z')
  await h.git('config', 'filter.upper.smudge', 'cat')
  await h.write('filtered.txt', 'first\n')
  await h.git('add', '.gitattributes', 'filtered.txt')
  await h.git('commit', '-m', 'filtered base')
  await h.git('update-ref', 'refs/heads/main', 'HEAD')
  saved = await gitStorage(h.root)
  await h.write('filtered.txt', 'second\n')
  expect(await repository.diff('filtered.txt', 'main')).toMatchObject({
    oldContent: 'FIRST\n',
    newContent: 'SECOND\n',
    patch: expect.stringContaining('-FIRST\n+SECOND\n'),
  })
  before = await checkpoint(repository)
  await h.write('filtered.txt', 'SECOND\n')
  expect(await changedSince(repository, 'main', before)).toEqual([])
  expect(await gitStorage(h.root)).toEqual(saved)
})

it('tracks submodule commits and worktree state without changing either index', async () => {
  const h = await repositoryFixture()
  const repository = new Repository(h.root)
  const child = await repositoryFixture()
  const original = (await child.git('rev-parse', 'HEAD')).trim()
  await child.write('committed.txt', 'child commit\n')
  await child.git('add', 'committed.txt')
  await child.git('commit', '-m', 'child change')
  const recorded = (await child.git('rev-parse', 'HEAD')).trim()
  await h.git(
    '-c',
    'protocol.file.allow=always',
    'submodule',
    'add',
    child.root,
    'module',
  )
  await h.git('commit', '-m', 'submodule base')
  await h.git('update-ref', 'refs/heads/main', 'HEAD')
  const saved = await gitStorage(h.root)
  let before = await checkpoint(repository)
  await h.git('-C', 'module', 'checkout', original)
  const moduleSaved = await gitStorage(join(h.root, 'module'))
  expect(
    (await changedSince(repository, 'main', before)).map((file) => file.path),
  ).toEqual(['module'])
  expect(await repository.diff('module', 'main')).toMatchObject({
    oldContent: `Subproject commit ${recorded}\n`,
    newContent: `Subproject commit ${original}\n`,
    patch: expect.stringContaining(`+Subproject commit ${original}`),
  })
  before = await checkpoint(repository)
  await h.write('module/README.md', 'module work\n')
  expect(
    (await changedSince(repository, 'main', before)).map((file) => file.path),
  ).toEqual(['module'])
  expect(await repository.diff('module', 'main')).toMatchObject({
    newContent: `Subproject commit ${original}-dirty\n`,
  })
  expect(await gitStorage(h.root)).toEqual(saved)
  expect(await gitStorage(join(h.root, 'module'))).toEqual(moduleSaved)
})

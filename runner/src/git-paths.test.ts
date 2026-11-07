import { mkdir, rm, symlink, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { repositoryFixture } from '../test-support/repository'
import { checkpoint, changedSince } from './checkpoint'
import { Repository } from './repository'
import { GitPathClassifier, type GitPathKind } from './git-paths'

it('keeps Git descendants absent below replacement files and links', async () => {
  const h = await runnerHarness()
  const repository = new Repository(h.root)
  await h.write('entry/old.txt', 'old child\n')
  await h.write('target/old.txt', 'target child\n')
  await h.git('add', 'entry', 'target')
  await h.git('commit', '-m', 'directory base')
  await h.git('update-ref', 'refs/heads/main', 'HEAD')
  const before = await checkpoint(repository)
  for (const kind of ['file', 'link']) {
    if (kind === 'link') {
      await unlink(join(h.root, 'entry'))
      await mkdir(join(h.root, 'entry'))
      await h.write('entry/old.txt', 'old child\n')
    }
    await rm(join(h.root, 'entry'), { recursive: true })
    if (kind === 'file') await h.write('entry', 'replacement\n')
    else await symlink('target', join(h.root, 'entry'))
    const reporting = repository.snapshot('main')
    await expect(reporting, kind).resolves.toMatchObject({
      entries: expect.arrayContaining([
        { path: 'entry', name: 'entry', kind: 'file', change: 'untracked' },
      ]),
    })
    const snapshot = await reporting
    expect(
      snapshot.entries.filter((entry) => entry.path.startsWith('entry/')),
      kind,
    ).toEqual([])
    await expect(
      repository.diff('entry/old.txt', 'main'),
      kind,
    ).resolves.toMatchObject({
      oldContent: 'old child\n',
      newContent: null,
      patch: expect.stringContaining('-old child\n'),
    })
    const after = await checkpoint(repository)
    expect([after.has('entry'), after.has('entry/old.txt')], kind).toEqual([
      true,
      false,
    ])
    expect(await changedSince(repository, 'main', before), kind).toEqual([
      { path: 'entry/old.txt', change: 'deleted', added: 0, removed: 1 },
      { path: 'entry', change: 'untracked', added: 1, removed: 0 },
    ])
    expect(
      (
        await repository.read(
          kind === 'link' ? 'entry/old.txt' : 'target/old.txt',
          100,
        )
      ).content,
    ).toBe('target child\n')
  }
  h.endpoint.disconnect()
  await h.runner.connect()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'runner.ready',
  })
  h.endpoint.send(turn())
  await h.runner.idle()
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
  })
})

it('caches parent kinds and preserves permission errors in the Git namespace', async () => {
  const denied = Object.assign(new Error('Permission denied.'), {
    code: 'EACCES',
  })
  const inspect = vi.fn(async (path: string): Promise<GitPathKind> => {
    if (path === '/repo/blocked') throw denied
    return 'link'
  })
  const paths = new GitPathClassifier('/repo', { inspect })
  expect(
    await Promise.all([paths.classify('parent/a'), paths.classify('parent/b')]),
  ).toEqual([
    { kind: 'absent', entry: 'absent' },
    { kind: 'absent', entry: 'absent' },
  ])
  expect(inspect.mock.calls).toEqual([['/repo/parent']])
  await expect(paths.classify('blocked/child')).rejects.toBe(denied)
})

it('returns only the old file deletion after its path becomes a directory', async () => {
  const h = await repositoryFixture()
  const repository = new Repository(h.root)
  await h.write('entry', 'old file\n')
  await h.git('add', 'entry')
  await h.git('commit', '-m', 'file base')
  await h.git('update-ref', 'refs/heads/main', 'HEAD')
  await unlink(join(h.root, 'entry'))
  await h.write('entry/new.txt', 'new child\n')
  await h.write('entry/another.txt', 'another child\n')
  for (const stage of ['unstaged', 'staged']) {
    if (stage === 'staged') await h.git('add', '-A')
    const reading = repository.diff('entry', 'main')
    await expect(reading, stage).resolves.toMatchObject({
      oldContent: 'old file\n',
      newContent: null,
      patch: expect.stringContaining('-old file\n'),
    })
    const diff = await reading
    expect(diff.patch, stage).not.toContain('new child')
    expect(diff.patch, stage).not.toContain('another child')
  }
})

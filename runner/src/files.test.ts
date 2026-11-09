import { symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { runnerHarness } from '../test-support/harness'

it('reports committed, staged, unstaged, renamed, and untracked branch changes', async () => {
  const h = await runnerHarness()
  await h.write('committed.txt', 'committed\n')
  await h.git('add', 'committed.txt')
  await h.git('commit', '-m', 'branch work')
  await h.write('README.md', 'first\nstaged\n')
  await h.git('add', 'README.md')
  await h.write('README.md', 'first\nstaged\nworking\n')
  await h.git('mv', 'rename me.txt', 'renamed file.txt')
  await h.write('new dir/file\twith\nbreak.txt', 'one\ntwo\n')
  await h.runner.files.refresh()
  const update = h.endpoint.runnerEvents.findLast(
    (event) => event.event.type === 'changes.updated',
  )?.event
  expect(update).toEqual({
    type: 'changes.updated',
    changes: {
      revision: 2,
      partNumber: 1,
      partCount: 1,
      baseBranch: 'main',
      unpushedCommits: 1,
      files: [
        {
          path: 'committed.txt',
          change: 'modified',
          added: 1,
          removed: 1,
          uncommitted: false,
        },
        {
          path: 'new dir/file\twith\nbreak.txt',
          change: 'untracked',
          added: 2,
          removed: 0,
          uncommitted: true,
        },
        {
          path: 'README.md',
          change: 'modified',
          added: 2,
          removed: 1,
          uncommitted: true,
        },
        {
          path: 'renamed file.txt',
          previousPath: 'rename me.txt',
          change: 'renamed',
          added: 0,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 4, added: 5, removed: 2 },
    },
  })
  expect(
    h.endpoint.runnerEvents.filter(
      (event) => event.event.type === 'files.snapshot',
    ),
  ).toHaveLength(1)
  const delta = h.endpoint.runnerEvents.findLast(
    (event) => event.event.type === 'files.changed',
  )?.event
  expect(delta).toMatchObject({
    type: 'files.changed',
    delta: {
      revision: 2,
      changes: expect.arrayContaining([
        { operation: 'remove', path: 'rename me.txt' },
        {
          operation: 'upsert',
          entry: {
            path: 'renamed file.txt',
            name: 'renamed file.txt',
            kind: 'file',
            change: 'renamed',
          },
        },
        {
          operation: 'upsert',
          entry: {
            path: 'new dir',
            name: 'new dir',
            kind: 'directory',
            change: null,
          },
        },
      ]),
    },
  })
  h.endpoint.send({
    type: 'file.diff',
    requestId: 'diff-1',
    path: 'README.md',
    defaultBranch: 'main',
  })
  h.endpoint.send({
    type: 'file.diff',
    requestId: 'diff-2',
    path: 'new dir/file\twith\nbreak.txt',
    defaultBranch: 'main',
  })
  await h.runner.idle()
  expect(
    h.endpoint.fileResponses.find(
      (response) => response.requestId === 'diff-1',
    ),
  ).toMatchObject({
    type: 'file.diff.result',
    result: {
      ok: true,
      diff: {
        path: 'README.md',
        oldContent: 'first\nsame\n',
        newContent: 'first\nstaged\nworking\n',
        binary: false,
      },
    },
  })
  expect(
    h.endpoint.fileResponses.find(
      (response) => response.requestId === 'diff-2',
    ),
  ).toMatchObject({
    type: 'file.diff.result',
    result: {
      ok: true,
      diff: {
        oldContent: null,
        newContent: 'one\ntwo\n',
        patch: expect.stringContaining('+one\n+two\n'),
      },
    },
  })
  h.endpoint.disconnect()
  await h.runner.connect()
  expect(
    h.endpoint.runnerEvents.filter(
      (event) => event.event.type === 'files.snapshot',
    ),
  ).toHaveLength(2)
  expect(h.warnings).toEqual([])
  await h.write('a[1].txt', 'bracket new\n')
  await h.write('a1.txt', 'plain new\n')
  h.endpoint.send({
    type: 'file.diff',
    requestId: 'bracket-diff',
    path: 'a[1].txt',
    defaultBranch: 'main',
  })
  await h.runner.idle()
  const bracket = h.endpoint.fileResponses.find(
    (response) => response.requestId === 'bracket-diff',
  )
  expect(bracket).toMatchObject({
    type: 'file.diff.result',
    result: {
      ok: true,
      diff: {
        oldContent: 'bracket old\n',
        newContent: 'bracket new\n',
        patch: expect.stringContaining('-bracket old\n+bracket new\n'),
      },
    },
  })
  expect(JSON.stringify(bracket)).not.toContain('plain new')
})

it('bounds file reads, preserves binary bytes, and prevents repository escapes', async () => {
  const h = await runnerHarness()
  await h.write('binary.bin', Buffer.from([0, 255, 1]))
  await writeFile(join(h.home, 'outside.txt'), 'private')
  await symlink(join(h.home, 'outside.txt'), join(h.root, 'outside-link'))
  await symlink(join(h.root, '.git/config'), join(h.root, 'git-link'))
  const eventCount = h.endpoint.events.length
  h.endpoint.send({
    type: 'file.read',
    requestId: 'read-1',
    path: 'README.md',
    maxBytes: 3,
  })
  h.endpoint.send({
    type: 'file.read',
    requestId: 'read-2',
    path: 'binary.bin',
    maxBytes: 3,
  })
  for (const path of [
    '../outside.txt',
    'outside-link',
    '.git/config',
    'git-link',
  ]) {
    h.endpoint.send({ type: 'file.read', requestId: path, path, maxBytes: 100 })
  }
  await h.runner.idle()
  expect(
    h.endpoint.fileResponses.find(
      (response) => response.requestId === 'read-1',
    ),
  ).toEqual({
    type: 'file.read.result',
    requestId: 'read-1',
    result: {
      ok: false,
      error: {
        code: 'file_too_large',
        message: 'The file exceeds the read limit.',
        sizeBytes: 11,
        limitBytes: 3,
      },
    },
  })
  expect(
    h.endpoint.fileResponses.find(
      (response) => response.requestId === 'read-2',
    ),
  ).toEqual({
    type: 'file.read.result',
    requestId: 'read-2',
    result: {
      ok: true,
      file: {
        path: 'binary.bin',
        mediaType: 'application/octet-stream',
        sizeBytes: 3,
        encoding: 'base64',
        content: 'AP8B',
      },
    },
  })
  expect(
    h.endpoint.fileResponses
      .filter(
        (response) =>
          response.requestId !== 'read-1' && response.requestId !== 'read-2',
      )
      .map((result) => result.result),
  ).toEqual(
    Array.from({ length: 4 }, () => ({
      ok: false,
      error: { code: 'file_unavailable', message: 'The file cannot be read.' },
    })),
  )
  expect(h.endpoint.events).toHaveLength(eventCount)
})

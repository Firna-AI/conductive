import { expect, it } from 'vitest'

import type { ChangesResponse } from '../../src/shared/files'
import { runnerHarness } from '../test-support/harness'

const textChanges: ChangesResponse = {
  baseBranch: 'main',
  files: [
    {
      path: 'README.md',
      change: 'modified',
      added: 1,
      removed: 1,
      uncommitted: true,
    },
  ],
  summary: { files: 1, added: 1, removed: 1 },
}

it('reports a second text edit when tree fields and line counts stay equal', async () => {
  const h = await runnerHarness()
  await h.write('README.md', 'first\nalpha\n')
  await h.runner.files.refresh()
  const before = h.endpoint.runnerEvents.length
  await h.write('README.md', 'first\nbravo\n')
  await h.runner.files.refresh()
  expect(
    h.endpoint.runnerEvents.slice(before).map(({ event }) => event),
  ).toEqual([
    {
      type: 'files.changed',
      delta: {
        revision: 3,
        changes: [
          {
            operation: 'upsert',
            entry: {
              path: 'README.md',
              name: 'README.md',
              kind: 'file',
              change: 'modified',
            },
          },
        ],
      },
    },
    {
      type: 'changes.updated',
      changes: {
        ...textChanges,
        revision: 3,
        partNumber: 1,
        partCount: 1,
      },
    },
  ])
  expect(h.warnings).toEqual([])
})

it('reports a second binary edit when tree fields and zero line counts stay equal', async () => {
  const h = await runnerHarness()
  await h.write('committed.txt', Buffer.from([0, 1, 2]))
  await h.runner.files.refresh()
  const before = h.endpoint.runnerEvents.length
  await h.write('committed.txt', Buffer.from([0, 3, 4]))
  await h.runner.files.refresh()
  expect(
    h.endpoint.runnerEvents.slice(before).map(({ event }) => event),
  ).toEqual([
    {
      type: 'files.changed',
      delta: {
        revision: 3,
        changes: [
          {
            operation: 'upsert',
            entry: {
              path: 'committed.txt',
              name: 'committed.txt',
              kind: 'file',
              change: 'modified',
            },
          },
        ],
      },
    },
    {
      type: 'changes.updated',
      changes: {
        baseBranch: 'main',
        files: [
          {
            path: 'committed.txt',
            change: 'modified',
            added: 0,
            removed: 0,
            uncommitted: true,
          },
        ],
        summary: { files: 1, added: 0, removed: 0 },
        revision: 3,
        partNumber: 1,
        partCount: 1,
      },
    },
  ])
  expect(h.warnings).toEqual([])
})

it('reports a moved default branch when working files and line counts stay equal', async () => {
  const h = await runnerHarness()
  await h.write('README.md', 'first\ntask\n')
  await h.git('add', 'README.md')
  await h.git('commit', '-m', 'task work')
  await h.runner.files.refresh()
  const before = h.endpoint.runnerEvents.length
  await h.git('checkout', 'main')
  await h.write('README.md', 'first\nmain\n')
  await h.git('add', 'README.md')
  await h.git('commit', '-m', 'main work')
  await h.git('checkout', 'task')
  await h.runner.files.refresh()
  expect(
    h.endpoint.runnerEvents.slice(before).map(({ event }) => event),
  ).toEqual([
    {
      type: 'changes.updated',
      changes: {
        ...textChanges,
        files: [{ ...textChanges.files[0], uncommitted: false }],
        revision: 3,
        partNumber: 1,
        partCount: 1,
      },
    },
  ])
  expect(h.warnings).toEqual([])
})

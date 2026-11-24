import { expect, it } from 'vitest'

import { parseChanges } from '../../src/files/api/parse-changes'
import { FilesState } from '../files/state'
import { chatFilesStorage } from './files-storage'
import { createRunnerLimitsFixture } from './runner-limits.test-support'
import { file, snapshot } from './runner-fixtures.test-support'

it('joins trees and independent changes parts before projection, live publication, and confirm across restart', async () => {
  const fixture = await createRunnerLimitsFixture()
  const files = new FilesState(chatFilesStorage(fixture.storage))
  await fixture.receive(1, snapshot(1, 1, 1, ['old.txt']))
  await fixture.receive(2, snapshot(2, 1, 2, ['a.txt']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'old.txt',
  ])
  expect(fixture.published.map(({ event }) => event.type)).toEqual([
    'files.snapshot',
  ])
  const part = (partNumber: number, path: string) => ({
    type: 'changes.updated',
    changes: {
      revision: 1,
      partNumber,
      partCount: 2,
      baseBranch: 'main',
      unpushedCommits: 3,
      uncommittedFileCount: 4,
      files: [
        { path, change: 'modified', added: 1, removed: 0, uncommitted: true },
      ],
      summary: { files: 2, added: 2, removed: 0 },
    },
  })
  await fixture.receive(3, part(1, 'a.txt'))
  await fixture.connect('stream', true)
  await fixture.receive(4, snapshot(2, 1, 2, ['a.txt']))
  await fixture.receive(5, snapshot(2, 2, 2, ['b.txt']))
  await fixture.receive(6, part(2, 'b.txt'))
  await fixture.receive(7, snapshot(2, 2, 2, ['b.txt']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'a.txt',
    'b.txt',
  ])
  expect((await files.changes())?.files.map((entry) => entry.path)).toEqual([
    'a.txt',
    'b.txt',
  ])
  expect(await files.changes()).toMatchObject({ unpushedCommits: 3 })
  expect(parseChanges(await files.changes())).toMatchObject({
    uncommittedFileCount: 4,
  })
  expect(fixture.published.at(-1)?.event).toMatchObject({
    type: 'changes.updated',
    changes: { unpushedCommits: 3, uncommittedFileCount: 4 },
  })
  expect((await fixture.history()).events.map(({ event }) => event)).toEqual(
    fixture.published.slice(1).map(({ event }) => event),
  )
  expect(
    (await fixture.history()).events.map(({ event }) => event.type),
  ).toEqual(['files.snapshot', 'changes.updated'])
  expect(JSON.stringify((await fixture.history()).events)).not.toContain(
    'partNumber',
  )
  expect(fixture.hooks).toEqual(fixture.published)
  expect(fixture.sent.at(-1)).toEqual({
    type: 'confirm',
    streamId: 'stream',
    throughEventNumber: 7,
  })
  const countedRemove = {
    revision: 3,
    omittedEntryCount: 5,
    changes: [{ operation: 'remove', path: 'missing.txt' }],
  }
  const delta = { type: 'files.changed', delta: countedRemove }
  await fixture.receive(8, delta)
  expect(fixture.published.at(-1)).toMatchObject({
    eventNumber: 4,
    event: delta,
  })
  await expect(files.tree()).resolves.toStrictEqual({
    revision: 3,
    omittedEntryCount: 5,
    entries: [file('a.txt'), file('b.txt')],
  })
})

it('publishes a count-only tree delta that clears the saved omission count', async () => {
  const fixture = await createRunnerLimitsFixture()
  const files = new FilesState(chatFilesStorage(fixture.storage))
  const snapshotEvent = snapshot(1, 1, 1, ['kept.txt'])
  await fixture.receive(1, {
    ...snapshotEvent,
    tree: { ...snapshotEvent.tree, omittedEntryCount: 7 },
  })
  await expect(files.tree()).resolves.toStrictEqual({
    revision: 1,
    omittedEntryCount: 7,
    entries: [file('kept.txt')],
  })

  const delta = {
    type: 'files.changed',
    delta: { revision: 2, omittedEntryCount: 0, changes: [] },
  }
  await fixture.receive(2, delta)
  expect(fixture.published.at(-1)).toMatchObject({
    eventNumber: 2,
    event: delta,
  })
  await expect(files.tree()).resolves.toStrictEqual({
    revision: 2,
    omittedEntryCount: 0,
    entries: [file('kept.txt')],
  })
  expect(
    (await fixture.history()).events.filter(
      ({ event }) => event.type === 'runner.event-refused',
    ),
  ).toEqual([])
})

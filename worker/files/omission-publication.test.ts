import { expect, it } from 'vitest'

import { chatFilesStorage } from '../chat/files-storage'
import { WORKSPACE_ID } from '../chat/harness.test-support'
import { file, snapshot } from '../chat/runner-fixtures.test-support'
import { filesCutoffFixture } from '../features/files-routes.test-support'
import { createHarness } from '../test-support/harness'
import { BUCKET_LAYOUT, FILES_KEY } from './bucket-layout'
import { readFilesManifest } from './storage'
import {
  readStoredTreeFields,
  writeStorageRecord,
} from './test-support/storage-record'

it('withholds a stale tree count from state reads, live updates, and replay', async () => {
  const harness = await createHarness()
  try {
    const f = await filesCutoffFixture(harness)
    const first = snapshot(1, 1, 1, ['kept.txt'])
    f.runner.emit({ ...first, tree: { ...first.tree, omittedEntryCount: 7 } })
    f.runner.emit({
      type: 'files.changed',
      delta: {
        revision: 2,
        changes: [{ operation: 'upsert', entry: file('rollback.txt') }],
      },
    })
    await f.drain()
    await f.changeWorkspace(WORKSPACE_ID, async ({ files }) => {
      const manifest = await readFilesManifest(files)
      if (manifest.layout !== BUCKET_LAYOUT || !manifest.tree)
        throw new Error('Expected a stored tree in buckets.')
      await writeStorageRecord(files, {
        [FILES_KEY]: {
          ...manifest,
          tree: {
            ...manifest.tree,
            fields: { ...manifest.tree.fields, omittedEntryCountRevision: 1 },
          },
        },
      })
    })

    const saved = await f.fetch(f.treePath)
    expect(saved.status).toBe(200)
    expect(await saved.json()).toEqual({
      revision: 2,
      entries: [file('kept.txt'), file('rollback.txt')],
      stateRead: { eventNumber: 3, repositoryId: 'repo', failure: null },
    })

    const live = await f.tab(3)
    const event = {
      type: 'files.changed',
      delta: { revision: 3, changes: [] },
    } as const
    f.runner.emit(event)
    await f.drain()
    const envelope = {
      workspaceId: WORKSPACE_ID,
      eventNumber: 4,
      occurredAt: 1_800_000_000_000,
      event,
    }
    expect(live.messages.at(-1)).toEqual({ type: 'event', envelope })
    await expect(
      readStoredTreeFields(chatFilesStorage(f.storage)),
    ).resolves.toStrictEqual({ revision: 3 })
    await live.close()

    const replay = await f.tab(3)
    expect(replay.messages).toEqual([
      {
        type: 'history',
        history: { events: [envelope], throughEventNumber: 4 },
      },
    ])
    await replay.close()
  } finally {
    await harness.dispose()
  }
})

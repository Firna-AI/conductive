import { expect, it } from 'vitest'

import type { FileEvent } from '../../src/shared/files'
import { MemoryChatStorage } from './memory-storage.test-support'
import {
  capStorageValues,
  grownEntries,
} from './runner-grown-reports.test-support'
import { ChatStore } from './store'

it('stores and reloads a grown tree delta that exceeds one SQLite value', async () => {
  const storage = new MemoryChatStorage()
  capStorageValues(storage)
  const event: FileEvent = {
    type: 'files.changed',
    delta: {
      revision: 2,
      changes: grownEntries.slice(0, 480).map((entry) => ({
        operation: 'upsert',
        entry,
      })),
    },
  }
  await expect(
    new ChatStore(storage, () => 25).change(
      'workspace',
      (transaction) => transaction.emit(event),
      () => undefined,
    ),
  ).resolves.toEqual({
    workspaceId: 'workspace',
    eventNumber: 1,
    occurredAt: 25,
    event,
  })
  const history = await new ChatStore(storage, () => 25).read(
    'workspace',
    (view) => view.history(0),
  )
  expect(history).toEqual({
    events: [
      { workspaceId: 'workspace', eventNumber: 1, occurredAt: 25, event },
    ],
    throughEventNumber: 1,
  })
})

import { expect, it } from 'vitest'
import type { FileEvent } from '../../src/shared/files'
import { nativeChatStore } from './native-store.test-support'
import { grownEntries } from './runner-grown-reports.test-support'
it('stores and reloads a grown tree delta that exceeds one SQLite value', async () => {
  const { actor } = await nativeChatStore()
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
    actor.api.controls.emitEvent('workspace', event),
  ).resolves.toEqual({
    workspaceId: 'workspace',
    eventNumber: 1,
    occurredAt: 25,
    event,
  })
  const history = await actor.api.controls.history('workspace')
  expect(history).toEqual({
    events: [
      { workspaceId: 'workspace', eventNumber: 1, occurredAt: 25, event },
    ],
    throughEventNumber: 1,
  })
})

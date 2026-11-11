import { expect, it } from 'vitest'

import { diskFixture } from '../test-support/disk'
import { EventStore } from './state'

it('keeps optional turn end reasons in the outbox across saves and reopen', async () => {
  const { storage } = await diskFixture()
  const store = await EventStore.open(storage)
  const completed = {
    type: 'turn.completed',
    sessionId: 'session',
    state: 'finished',
    durationMs: 125_000,
    files: [
      { path: 'src/checks.ts', change: 'modified', added: 2, removed: 1 },
    ],
    omittedFileCount: 0,
    userMessageIds: [],
  } as const
  const events = [
    { ...completed, turnId: 'limited', endReason: 'background_work_limit' },
    { ...completed, turnId: 'ordinary' },
  ] as const
  for (const event of events) await store.append(event, 100)
  expect(store.snapshot.outbox.map(({ event }) => event)).toEqual(events)
  const reopened = await EventStore.open(storage)
  expect(reopened.snapshot.outbox.map(({ event }) => event)).toEqual(events)
})

import { expect, it } from 'vitest'
import { jsonBytes } from '../../src/shared/event-limits'
import type { WorkspaceNoticeKind } from '../../src/shared/workspace-state-read'
import { heldOperation } from '../test-support/held-operation'
import {
  legacyHistory,
  sessionAnswer,
} from './history-session-index.test-support'
import { nativeChatStore } from './native-store.test-support'
import { ReportRepairs } from './report-repairs'
import { CHAT_META, chatEventKey, chatKey } from './storage-keys'
import { ChatStore } from './store'
import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import {
  previousWorkerWrite,
  trackRecoveryPages,
} from './workspace-read-recovery.test-support'
import {
  failure,
  noFailures,
  readState,
} from './workspace-read-state.test-support'

const ports = { type: 'ports.updated', ports: null } satisfies WorkspaceEvent
const skills = {
  type: 'skills.updated',
  skills: {
    claude: [{ name: 'plans', description: 'Plan changes' }],
    codex: [],
  },
} satisfies WorkspaceEvent

function fileReport(size: number): WorkspaceEvent {
  return {
    type: 'files.snapshot',
    tree: {
      revision: 1,
      entries: [
        { path: 'x'.repeat(size), name: 'file', kind: 'file', change: null },
      ],
    },
  }
}

const kinds: readonly WorkspaceNoticeKind[] = [
  'files.snapshot',
  'changes.updated',
  'workspace.title',
  'start.updated',
  'ports.updated',
]

it('recovers the first open failures and newest skills in four-record lists without loading either file descriptor', async () => {
  const { storage } = await nativeChatStore()
  const repairs = new ReportRepairs(storage)
  const oldNotice = failure('workspace.title', 1, 10, 1, 'older-stream')
  await previousWorkerWrite(storage, oldNotice.event, oldNotice.occurredAt)
  await previousWorkerWrite(storage, fileReport(4_096))
  await previousWorkerWrite(storage, fileReport(1_048_576))
  await previousWorkerWrite(
    storage,
    { type: 'skills.updated', skills: null },
    12,
  )
  for (const [index, kind] of kinds.entries()) {
    const eventNumber = index + 1
    await previousWorkerWrite(
      storage,
      {
        type: 'runner.event-refused',
        streamId: 'current-stream',
        runnerEventNumber: eventNumber,
        runnerEventType: kind === 'files.snapshot' ? 'files.changed' : kind,
        reason: 'invalid',
        sessionId: null,
        turnId: null,
      },
      13 + index,
    )
    await repairs.save({
      command: { type: 'report.refresh', commandId: kind, kind },
      state: 'failed',
      sent: true,
      replacementRevision: null,
      cause: { streamId: 'current-stream', eventNumber, revision: null },
    })
  }
  await previousWorkerWrite(
    storage,
    failure('ports.updated', 10, 18, 6, 'current-stream').event,
    18,
  )
  await previousWorkerWrite(storage, ports, 19)
  await previousWorkerWrite(storage, skills, 20)
  const first = {
    'files.snapshot': failure('files.snapshot', 13, 21, 7, 'current-stream'),
    'changes.updated': failure('changes.updated', 14, 22, 8, 'current-stream'),
    'workspace.title': failure('workspace.title', 15, 23, 9, 'current-stream'),
    'start.updated': failure('start.updated', 16, 24, 10, 'current-stream'),
    'ports.updated': failure('ports.updated', 17, 25, 11, 'current-stream'),
  }
  for (const notice of Object.values(first))
    await previousWorkerWrite(storage, notice.event, notice.occurredAt)
  for (const notice of Object.values(first))
    await previousWorkerWrite(
      storage,
      {
        ...notice.event,
        runnerEventNumber: notice.event.runnerEventNumber + 5,
      },
      notice.occurredAt + 5,
    )
  const entry = { path: '', name: 'file', kind: 'file' as const, change: null }
  const inline = {
    workspaceId: 'workspace',
    eventNumber: 23,
    occurredAt: 31,
    event: {
      type: 'files.changed',
      delta: { revision: 2, changes: [{ operation: 'upsert', entry }] },
    },
  } satisfies WorkspaceEventEnvelope
  // The previous writer kept file events of up to 1 MiB inline.
  entry.path = 'x'.repeat(1_048_576 - jsonBytes(inline))
  await storage.put(chatEventKey(inline.eventNumber), inline)
  await storage.put(CHAT_META, {
    workspaceId: inline.workspaceId,
    through: inline.eventNumber,
    commandThrough: 0,
  })

  const tracked = trackRecoveryPages(storage)
  expect(await readState(new ChatStore(tracked.storage, () => 50))).toEqual({
    eventNumber: 23,
    state: {
      repositoryId: null,
      ports: { eventNumber: 11, occurredAt: 19, event: ports },
      skills: { eventNumber: 12, occurredAt: 20, event: skills },
      failures: first,
    },
  })
  expect(
    tracked.lists.filter(({ reverse, limit }) => reverse && limit === 4),
  ).toHaveLength(6)
  expect(tracked.lists).toHaveLength(6)
  expect(tracked.lists.map(({ end }) => end)).toEqual([
    `${chatEventKey(23)}\u0000`,
    ...[20, 16, 12, 8, 4].map(chatEventKey),
  ])
  expect(
    tracked.reads.filter((key) => key.startsWith(chatKey('history-chunk', ''))),
  ).toEqual([])
})

it('resumes after eviction from the history page that already committed', async () => {
  const { actor, storage } = await nativeChatStore()
  await legacyHistory(storage, [
    ports,
    ...Array.from({ length: 9 }, (_, index) =>
      sessionAnswer(`answer-${index}`),
    ),
  ])
  const stopped = trackRecoveryPages(storage, async () => {
    throw new Error('Stopped after a committed recovery page')
  })
  const firstStore = new ChatStore(stopped.storage, () => 25)
  await expect(readState(firstStore)).rejects.toThrow(
    'Stopped after a committed recovery page',
  )
  const instance = await actor.api.controls.instanceId()
  await actor.crash()
  expect(await actor.api.controls.instanceId()).not.toBe(instance)
  const resumed = trackRecoveryPages(storage)
  expect(await readState(new ChatStore(resumed.storage, () => 25))).toEqual({
    eventNumber: 10,
    state: {
      ports: { eventNumber: 1, occurredAt: 25, event: ports },
      skills: null,
      repositoryId: null,
      failures: noFailures,
    },
  })
  expect(stopped.lists.map(({ end }) => end)).toEqual([
    `${chatEventKey(10)}\u0000`,
  ])
  expect(resumed.lists.map(({ end }) => end)).toEqual([
    chatEventKey(7),
    chatEventKey(3),
  ])
})

it('waits after a rollback write without an event and restarts when a second rollback drops the mark mid-scan', async () => {
  const { storage } = await nativeChatStore()
  const name = failure('workspace.title', 2, 21, 2)
  const { repairFailed, ...cause } = name.event
  await previousWorkerWrite(storage, { ...cause, runnerEventNumber: 1 }, 20)
  await previousWorkerWrite(storage, { ...cause, repairFailed }, 21)
  for (let i = 0; i < 8; i++)
    await previousWorkerWrite(storage, sessionAnswer(`answer-${i}`))
  const repairs = new ReportRepairs(storage)
  await repairs.save({
    command: {
      type: 'report.refresh',
      kind: 'workspace.title',
      commandId: 'name',
    },
    cause: { streamId: 'fake-stream-1', eventNumber: 1, revision: null },
    state: 'failed',
    sent: true,
    replacementRevision: null,
  })
  const initial = new ChatStore(storage, () => 25)
  expect((await readState(initial)).state.failures['workspace.title']).toEqual(
    name,
  )
  await storage.transaction(async (data) => {
    await new ReportRepairs(data).remove('workspace.title')
    await previousWorkerWrite(data)
  })
  const held = heldOperation()
  const tracked = trackRecoveryPages(storage, async () => {
    if (tracked.lists.length === 1) await held.wait()
  })
  const store = new ChatStore(tracked.storage, () => 25)
  const reading = readState(store)
  try {
    expect(
      await Promise.race([
        held.entered.then(() => 'page committed'),
        reading.then(() => 'read finished without a page'),
      ]),
    ).toBe('page committed')
    const joined = readState(store)
    const rolledBack = store.run(() =>
      storage.transaction((data) => previousWorkerWrite(data, ports, 30)),
    )
    held.release()
    await rolledBack
    const expected = {
      eventNumber: 11,
      state: {
        ports: { eventNumber: 11, occurredAt: 30, event: ports },
        skills: null,
        repositoryId: null,
        failures: noFailures,
      },
    }
    expect(await reading).toEqual(expected)
    expect(await joined).toEqual(expected)
    expect(tracked.lists.map(({ end }) => end)).toEqual([
      `${chatEventKey(10)}\u0000`,
      `${chatEventKey(11)}\u0000`,
      chatEventKey(8),
      chatEventKey(4),
    ])
  } finally {
    held.release()
    await reading
  }
})

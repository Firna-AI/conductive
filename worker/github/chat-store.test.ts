import { afterEach, beforeEach, expect, it } from 'vitest'

import { array } from '../chat/agent-events'
import { record } from '../chat/inputs'
import { CHAT_EVENT_PREFIX, CHAT_META } from '../chat/storage-keys'
import {
  SQLITE_TIME,
  SQLITE_WORKSPACE_ID,
  sqlitePullSnapshot,
  sqliteSnapshot,
} from './sqlite-fixtures.test-support'
import {
  createGitHubSQLiteHarness,
  eventOrder,
  historyMessages,
  liveEvents,
  storedRecords,
  type GitHubSQLiteHarness,
} from './sqlite-harness.test-support'

let harness: GitHubSQLiteHarness
beforeEach(async () => {
  harness = await createGitHubSQLiteHarness()
})
afterEach(async () => {
  await harness.dispose()
})

const envelope = {
  workspaceId: SQLITE_WORKSPACE_ID,
  eventNumber: 1,
  occurredAt: SQLITE_TIME,
  event: {
    type: 'github.updated',
    banner: sqliteSnapshot().banner,
    checks: sqliteSnapshot().checks,
  },
}
const receipt = {
  snapshot: sqliteSnapshot(),
  envelope: {
    workspaceId: SQLITE_WORKSPACE_ID,
    eventNumber: 1,
    occurredAt: SQLITE_TIME,
  },
}

it('rolls back every SQLite record and publication on a failed receipt write, then retries at event 1', async () => {
  expect((await harness.request('/observe')).status).toBe(204)
  const failed = await harness.request('/refresh?delivery=d-1&fail-receipt')
  expect(failed.status).toBe(500)
  expect(await failed.json()).toEqual({
    error: 'Injected receipt write failure',
  })
  const rolledBack = await harness.inspect()
  expect(rolledBack.records).toEqual([])
  expect(liveEvents(rolledBack)).toEqual([])
  expect(rolledBack.reads).toBe(1)

  const retried = await harness.request('/refresh?delivery=d-1')
  expect(retried.status).toBe(200)
  expect(await retried.json()).toEqual({ snapshot: sqliteSnapshot() })
  const committed = await harness.inspect()
  expect(committed.reads).toBe(2)
  expect(liveEvents(committed)).toEqual([envelope])
  expect(storedRecords(committed).get('github:delivery:d-1')).toEqual(receipt)
  expect((await harness.request('/observe')).status).toBe(204)
  expect(historyMessages(await harness.inspect())).toEqual([
    { events: [], throughEventNumber: 0 },
    { events: [envelope], throughEventNumber: 1 },
  ])
})

it('publishes interleaved chat and GitHub changes in consecutive common history order', async () => {
  expect((await harness.request('/observe')).status).toBe(204)
  expect((await harness.createSession()).status).toBe(201)
  expect(
    (await harness.request('/refresh?delivery=interleaved&interleave')).status,
  ).toBe(200)
  const inspection = await harness.inspect()
  const expected = [
    { eventNumber: 1, type: 'session.updated' },
    { eventNumber: 2, type: 'github.updated' },
    { eventNumber: 3, type: 'session.updated' },
  ]
  expect(eventOrder(liveEvents(inspection))).toEqual(expected)
  expect((await harness.request('/observe')).status).toBe(204)
  const histories = historyMessages(await harness.inspect())
  expect(histories).toHaveLength(2)
  expect(eventOrder(histories[1]?.events)).toEqual(expected)
  expect(histories[1]?.throughEventNumber).toBe(3)
  expect(storedRecords(inspection).get('github:delivery:interleaved')).toEqual({
    ...receipt,
    envelope: { ...receipt.envelope, eventNumber: 2 },
  })
})

it('stages the snapshot, event, cursor, and receipt in one SQLite transaction before publication', async () => {
  expect((await harness.request('/observe')).status).toBe(204)
  expect((await harness.request('/refresh?delivery=atomic')).status).toBe(200)
  const inspection = await harness.inspect()
  const staged = array(inspection.staged, record)
  expect(staged).toHaveLength(1)
  const transaction = record(staged[0])
  const records = storedRecords(transaction)
  expect(records.get('github:state')).toEqual(sqliteSnapshot())
  expect(records.get('github:delivery:atomic')).toEqual(receipt)
  expect(
    [...records.entries()]
      .filter(([key]) => key.startsWith(CHAT_EVENT_PREFIX))
      .map(([, value]) => value),
  ).toEqual([envelope])
  expect(
    [...records.entries()]
      .filter(([key]) => key === CHAT_META)
      .map(([, value]) => value),
  ).toEqual([
    { workspaceId: SQLITE_WORKSPACE_ID, through: 1, commandThrough: 0 },
  ])
  expect(liveEvents(transaction)).toEqual([])
  expect(liveEvents(inspection)).toEqual([envelope])
  expect(storedRecords(inspection)).toEqual(records)
})

it('uses one publisher for a fresh commit and replays its original envelope after SQLite eviction without a read', async () => {
  expect((await harness.request('/observe')).status).toBe(204)
  expect((await harness.request('/refresh?delivery=replay')).status).toBe(200)
  expect(liveEvents(await harness.inspect())).toEqual([envelope])
  await harness.evict()
  expect((await harness.request('/observe')).status).toBe(204)
  const replay = await harness.request(
    '/refresh?delivery=replay&forbid-read&time=1800000005000',
  )
  expect(replay.status).toBe(200)
  expect(await replay.json()).toEqual({ snapshot: sqliteSnapshot() })
  const inspection = await harness.inspect()
  expect(inspection.reads).toBe(0)
  expect(inspection.staged).toEqual([])
  expect(liveEvents(inspection)).toEqual([envelope])
  expect(historyMessages(inspection)).toEqual([
    { events: [envelope], throughEventNumber: 1 },
  ])
  expect((await harness.request('/observe')).status).toBe(204)
  expect(historyMessages(await harness.inspect())[1]).toEqual({
    events: [envelope],
    throughEventNumber: 1,
  })
})

it('repairs a failed summary copy after SQLite eviction without another GitHub read', async () => {
  const snapshot = sqlitePullSnapshot()
  const original = {
    ...envelope,
    event: {
      type: 'github.updated',
      banner: snapshot.banner,
      checks: snapshot.checks,
    },
  }
  const summary = () =>
    harness.db
      .prepare('SELECT github_summary FROM workspaces WHERE id = ?')
      .bind(SQLITE_WORKSPACE_ID)
      .first('github_summary')
  expect((await harness.request('/observe')).status).toBe(204)
  await harness.db
    .prepare(
      `CREATE TRIGGER fail_summary_copy BEFORE UPDATE OF github_summary ON workspaces
    BEGIN SELECT RAISE(ABORT, 'Injected summary copy failure'); END`,
    )
    .run()
  const failed = await harness.request(
    '/refresh?delivery=summary-retry&pull-request',
  )
  expect(failed.status).toBe(500)
  expect(await failed.json()).toEqual({
    error: expect.stringContaining('Injected summary copy failure'),
  })
  const committed = await harness.inspect()
  const records = storedRecords(committed)
  expect(records.get('github:state')).toEqual(snapshot)
  expect(records.get('github:delivery:summary-retry')).toEqual({
    ...receipt,
    snapshot,
  })
  expect(
    [...records.entries()]
      .filter(([key]) => key.startsWith(CHAT_EVENT_PREFIX))
      .map(([, value]) => value),
  ).toEqual([original])
  expect(liveEvents(committed)).toEqual([original])
  expect(committed.reads).toBe(1)
  expect(await summary()).toBeNull()

  await harness.evict()
  await harness.db.prepare('DROP TRIGGER fail_summary_copy').run()
  expect((await harness.request('/observe')).status).toBe(204)
  const replay = await harness.request(
    '/refresh?delivery=summary-retry&pull-request&forbid-read',
  )
  expect(replay.status).toBe(200)
  expect(await replay.json()).toEqual({ snapshot })
  const repaired = await harness.inspect()
  expect(await summary()).toBe('ready-to-merge')
  expect(repaired.reads).toBe(0)
  expect(repaired.staged).toEqual([])
  expect(storedRecords(repaired)).toEqual(records)
  expect(liveEvents(repaired)).toEqual([original])
  expect(historyMessages(repaired)).toEqual([
    { events: [original], throughEventNumber: 1 },
  ])
})

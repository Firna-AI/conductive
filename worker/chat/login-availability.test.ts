import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import * as crypto from '../security/crypto'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'
import { captureLoginQueries } from './login-queries.test-support'
import { startTurn } from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it('loads open-session starter metadata in one query for one or four sessions without reading credentials', async () => {
  const fixture = await createChatFixture(harness)
  const first = await fixture.createSession()
  const closed = await fixture.createSession(CODEX, fixture.memberCookie)
  expect(
    (
      await fixture.fetch(
        sessionPaths.close(fixture.org.id, WORKSPACE_ID, closed.id),
        { stopRunningTurn: false },
      )
    ).status,
  ).toBe(200)
  const decrypt = vi.spyOn(crypto, 'decrypt')
  const queries = captureLoginQueries(fixture.env)
  const list = sessionsPath(fixture.org.id, WORKSPACE_ID)
  expect((await fixture.fetch(list)).status).toBe(200)
  expect((await fixture.fetch(list)).status).toBe(200)
  expect((await fixture.history(first.id)).events).toHaveLength(1)
  expect(queries).toEqual([])
  const one = await fixture.tab(0, undefined, fixture.memberCookie)
  expect(one.messages[0]?.type).toBe('history')
  expect(queries).toHaveLength(1)
  expect(queries[0]?.query).not.toMatch(/ciphertext|SELECT\s+\*/i)
  expect(queries[0]?.bindings).toEqual([
    JSON.stringify([
      { sessionId: first.id, userId: fixture.owner.id, agent: 'claude' },
    ]),
    WORKSPACE_ID,
  ])
  expect(decrypt).not.toHaveBeenCalled()
  one.close()

  const second = await fixture.createSession(CODEX)
  const third = await fixture.createSession(CLAUDE)
  const fourth = await fixture.createSession(CODEX)
  queries.length = 0
  decrypt.mockClear()
  const four = await fixture.tab(0, undefined, fixture.memberCookie)
  expect(four.messages[0]?.type).toBe('history')
  expect(queries).toHaveLength(1)
  expect(queries[0]?.query).not.toMatch(/ciphertext|SELECT\s+\*/i)
  expect(queries[0]?.bindings).toEqual([
    JSON.stringify([
      { sessionId: first.id, userId: fixture.owner.id, agent: 'claude' },
      { sessionId: second.id, userId: fixture.owner.id, agent: 'codex' },
      { sessionId: third.id, userId: fixture.owner.id, agent: 'claude' },
      { sessionId: fourth.id, userId: fixture.owner.id, agent: 'codex' },
    ]),
    WORKSPACE_ID,
  ])
  expect(decrypt).not.toHaveBeenCalled()
  const response = await fixture.fetch(list)
  expect(await response.json()).toMatchObject({
    sessions: [
      { id: first.id, loginAvailable: true },
      { id: second.id, loginAvailable: true },
      { id: third.id, loginAvailable: true },
      { id: fourth.id, loginAvailable: true },
    ],
    history: [{ id: closed.id, loginAvailable: true }],
  })
  four.close()
})

it('keeps list and history reads free of login checks while a ready runner holds undelivered input', async () => {
  let revokeAtAcceptance = false
  const fixture = await createChatFixture(harness, {
    resolveAttachments: async () => {
      if (revokeAtAcceptance)
        await harness.env.DB.prepare('DELETE FROM agent_logins').run()
      return { attachments: [], paths: [] }
    },
  })
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'running')
  revokeAtAcceptance = true
  await fixture.send(session.id, 'held-input')
  expect(runner.commands).toHaveLength(1)
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
  ).toMatchObject([{ type: 'message', messageId: 'held-input' }])
  const queries = captureLoginQueries(fixture.env)
  const records = structuredClone(fixture.storage.records)
  const writes = fixture.storage.writes.length
  const response = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    sessions: [
      { id: session.id, activeTurnId: turn.turnId, loginAvailable: false },
    ],
  })
  expect(
    (await fixture.history(session.id)).events.map(({ event }) => event.type),
  ).toContain('message.accepted')
  expect(queries).toEqual([])
  expect(fixture.storage.records).toEqual(records)
  expect(fixture.storage.writes).toHaveLength(writes)
  expect(runner.commands).toHaveLength(1)
  runner.disconnect()
})

it('serves another member the list and subscription when the starter ciphertext is damaged', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await harness.env.DB.prepare(
    'UPDATE agent_logins SET ciphertext = ? WHERE user_id = ? AND agent = ?',
  )
    .bind('damaged-login-ciphertext', fixture.owner.id, 'claude')
    .run()
  const response = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
    undefined,
    fixture.memberCookie,
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ sessions: [session], history: [] })
  const subscription = fixture.tab(0, undefined, fixture.memberCookie)
  await expect(subscription).resolves.toMatchObject({ closed: 0 })
  const tab = await subscription
  expect(tab.messages).toEqual([
    { type: 'history', history: await fixture.history(session.id) },
  ])
  expect(JSON.stringify(tab.messages)).not.toContain('damaged-login-ciphertext')
  expect(JSON.stringify(tab.messages)).not.toContain('secret-')
  tab.close()
})

it('leaves closed-session availability and storage unchanged during reads and a new subscription', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const closed = await fixture.fetch(
    sessionPaths.close(fixture.org.id, WORKSPACE_ID, session.id),
    { stopRunningTurn: false },
  )
  expect(closed.status).toBe(200)
  await harness.env.DB.prepare('DELETE FROM agent_logins').run()
  const queries = captureLoginQueries(fixture.env)
  const records = structuredClone(fixture.storage.records)
  const writes = fixture.storage.writes.length
  const response = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    sessions: [],
    history: [{ id: session.id, loginAvailable: true }],
  })
  expect((await fixture.history(session.id)).events).toHaveLength(2)
  const tab = await fixture.tab()
  expect(tab.messages[0]?.type).toBe('history')
  expect(queries).toEqual([])
  expect(fixture.storage.records).toEqual(records)
  expect(fixture.storage.writes).toHaveLength(writes)
  tab.close()
})

it('leaves archived-workspace availability and storage unchanged during reads and a new subscription', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await harness.env.DB.prepare(
    'UPDATE workspaces SET archived_at = ? WHERE id = ?',
  )
    .bind(fixture.clock.now(), WORKSPACE_ID)
    .run()
  await harness.env.DB.prepare('DELETE FROM agent_logins').run()
  const queries = captureLoginQueries(fixture.env)
  const records = structuredClone(fixture.storage.records)
  const writes = fixture.storage.writes.length
  const response = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ sessions: [session], history: [] })
  expect((await fixture.history(session.id)).events).toHaveLength(1)
  const tab = await fixture.tab()
  expect(tab.messages[0]?.type).toBe('history')
  expect(queries).toEqual([])
  expect(fixture.storage.records).toEqual(records)
  expect(fixture.storage.writes).toHaveLength(writes)
  tab.close()
})

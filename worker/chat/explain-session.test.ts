import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionLink } from '../../src/shared/session-link'
import {
  sessionsPath,
  type ExplainSessionResponse,
  type SessionsResponse,
} from '../../src/shared/sessions'
import { saveAccountDefault } from '../app-api/account-data'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { CLAUDE, CODEX, WORKSPACE_ID } from './harness.test-support'
import {
  EXPLAIN_INPUT,
  explanationFixture,
} from './explain-session.test-support'
import { chatKey } from './storage-keys'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('starts an open anchored session, writes its prompt and title, and dispatches the queued member message', async () => {
  const { fixture, parent, explain } = await explanationFixture(harness)
  const tab = await fixture.tab()
  const response = await explain({ ...EXPLAIN_INPUT, choice: CODEX })
  expect(response.status).toBe(201)
  const reply: ExplainSessionResponse = await response.json()
  const anchor = { parentSessionId: parent.id, ...EXPLAIN_INPUT }
  expect(reply.session).toMatchObject({
    workspaceId: WORKSPACE_ID,
    title: 'Explain "Selected text"',
    choice: CODEX,
    closedAt: null,
    startedBy: { id: fixture.member.id },
    login: { type: 'personal', userId: fixture.member.id },
    anchor,
  })
  expect(reply.session.id).not.toBe(parent.id)
  const link = sessionLink(TEST_ORIGIN, fixture.org.id, WORKSPACE_ID, parent.id)
  expect(reply.message).toMatchObject({
    sessionId: reply.session.id,
    sender: { id: fixture.member.id },
    choice: CODEX,
    state: 'queued',
    attachments: [],
    text: `Explain "Selected text"\n\nSession: ${link}\nMessage: parent-message\nThe text with the lines around it:\n> Before\n> Selected text\n> After\n\nRead that session with \`read_session\` if you need more context. Change no files. Keep the answer short, because it shows in a small popover.`,
  })
  expect(reply.turnId).toBeNull()
  const history = await fixture.history(reply.session.id)
  expect(reply.eventNumber).toBe(history.throughEventNumber)
  expect(history.events.map(({ event }) => event.type)).toEqual([
    'session.updated',
    'message.accepted',
    'session.updated',
  ])
  expect(history.events[0].event).toMatchObject({
    type: 'session.updated',
    session: { anchor },
  })
  expect(tab.messages.at(-1)).toMatchObject({
    type: 'event',
    envelope: { eventNumber: reply.eventNumber },
  })
  await tab.close()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(
    runner.commands.filter(
      (command) =>
        command.type === 'turn' && command.sessionId === reply.session.id,
    ),
  ).toMatchObject([
    {
      type: 'turn',
      sessionId: reply.session.id,
      message: { id: reply.message.id, sender: { id: fixture.member.id } },
    },
  ])
  await fixture.restart()
  const listed: SessionsResponse = await (
    await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
  ).json()
  expect(
    listed.sessions.find(({ id }) => id === reply.session.id),
  ).toMatchObject({ anchor, title: 'Explain "Selected text"' })
})

it('prefers the body choice, then the sending member default, then the app default', async () => {
  const { fixture, path, explain } = await explanationFixture(harness)
  await saveAccountDefault(fixture.env.DB, fixture.member.id, CODEX, TEST_TIME)
  const explicitResponse = await explain({ ...EXPLAIN_INPUT, choice: CLAUDE })
  expect(explicitResponse.status).toBe(201)
  const explicit: ExplainSessionResponse = await explicitResponse.json()
  expect(explicit.session.choice).toEqual(CLAUDE)
  const saved: ExplainSessionResponse = await (await explain()).json()
  expect(saved.session.choice).toEqual(CODEX)
  const fallback: ExplainSessionResponse = await (
    await fixture.fetch(path, EXPLAIN_INPUT)
  ).json()
  expect(fallback.session.choice).toEqual(CLAUDE)
})

it('turns fast mode off for a saved default, and keeps it for a body choice', async () => {
  const { fixture, explain } = await explanationFixture(harness)
  const fastCodex = { ...CODEX, fast: true }
  await saveAccountDefault(
    fixture.env.DB,
    fixture.member.id,
    fastCodex,
    TEST_TIME,
  )
  const saved: ExplainSessionResponse = await (await explain()).json()
  expect(saved.session.choice).toEqual({ ...CODEX, fast: false })
  const asked: ExplainSessionResponse = await (
    await explain({ ...EXPLAIN_INPUT, choice: fastCodex })
  ).json()
  expect(asked.session.choice.fast).toBe(true)
})

it('lets the existing title rule cut a long first quote line at a whole word', async () => {
  const { explain } = await explanationFixture(harness)
  const response = await explain({
    ...EXPLAIN_INPUT,
    quote:
      'one two three four five six seven eight nine ten eleven twelve thirteen\nSecond line',
  })
  expect(response.status).toBe(201)
  const reply: ExplainSessionResponse = await response.json()
  expect(reply.session.title).toBe(
    'Explain "one two three four five six seven eight nine ten',
  )
  expect(reply.message.text.split('\n')[0]).toBe(
    'Explain "one two three four five six seven eight nine ten eleven twelve thirteen"',
  )
})

it('reads an old stored session without adding an anchor', async () => {
  const { fixture, parent } = await explanationFixture(harness)
  await fixture.storage.put(chatKey('session', parent.id), {
    id: parent.id,
    workspaceId: WORKSPACE_ID,
    title: 'Old session',
    choice: CLAUDE,
    createdAt: TEST_TIME,
    closedAt: null,
    activeTurnId: null,
  })
  await fixture.restart()
  const response = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
  )
  expect(response.status).toBe(200)
  const listed: SessionsResponse = await response.json()
  expect(listed.sessions).toHaveLength(1)
  expect(listed.sessions[0]).toMatchObject({
    id: parent.id,
    title: 'Old session',
  })
  expect(listed.sessions[0]).not.toHaveProperty('anchor')
})

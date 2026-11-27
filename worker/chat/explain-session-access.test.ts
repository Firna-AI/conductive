import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  explainSessionPath,
  sessionPaths,
  type ExplainSessionResponse,
} from '../../src/shared/sessions'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { CLAUDE, CODEX, WORKSPACE_ID } from './harness.test-support'
import {
  ASK_INPUT,
  EXPLAIN_INPUT,
  explanationFixture,
} from './explain-session.test-support'

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

it('refuses blank and malformed selections without creating a session', async () => {
  const { fixture, explain } = await explanationFixture(harness)
  const before = (await fixture.snapshot()).records
  for (const input of [
    { quote: ' \n\t ' },
    { messageId: '' },
    { messageId: 3 },
    { quote: null },
    { before: undefined },
    { after: [] },
    { choice: null },
  ]) {
    const response = await explain({ ...EXPLAIN_INPUT, ...input })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'invalid_input',
        message: 'Check the message and try again.',
      },
    })
  }
  expect((await fixture.snapshot()).records).toEqual(before)
})

it('rejects a changed explicit model choice and returns the first explanation for the original choice', async () => {
  const { explain } = await explanationFixture(harness)
  const input = { ...ASK_INPUT, choice: CLAUDE }
  const started = await explain(input)
  expect(started.status).toBe(201)
  const first: ExplainSessionResponse = await started.json()
  expect(first.message.choice).toEqual(CLAUDE)

  const changed = await explain({ ...input, choice: CODEX })
  expect(changed.status).toBe(409)
  expect(await changed.json()).toMatchObject({
    error: { code: 'message_id_conflict' },
  })

  const matching = await explain(input)
  expect(matching.status).toBe(201)
  expect(await matching.json()).toEqual(first)
})

it('cuts a long quote and long context so that each part stays next to the quote', async () => {
  const { explain } = await explanationFixture(harness)
  const response = await explain({
    ...EXPLAIN_INPUT,
    quote: `${'q'.repeat(2000)}cut`,
    before: `cut${'b'.repeat(300)}`,
    after: `${'a'.repeat(300)}cut`,
  })
  expect(response.status).toBe(201)
  const reply: ExplainSessionResponse = await response.json()
  expect(reply.session.anchor).toMatchObject({
    quote: 'q'.repeat(2000),
    before: 'b'.repeat(300),
    after: 'a'.repeat(300),
  })
})

it('refuses an unknown parent or a message outside the parent history', async () => {
  const { fixture, parent, explain } = await explanationFixture(harness)
  const other = await fixture.createSession()
  await fixture.send(other.id, 'other-message')
  const before = (await fixture.snapshot()).records
  const missing = await fixture.fetch(
    explainSessionPath(fixture.org.id, WORKSPACE_ID, 'missing'),
    EXPLAIN_INPUT,
  )
  expect(missing.status).toBe(404)
  expect(await missing.json()).toMatchObject({
    error: { code: 'session_not_found' },
  })
  for (const messageId of ['missing-message', 'other-message']) {
    const response = await explain({ ...EXPLAIN_INPUT, messageId })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: 'message_not_found',
        message: 'The message is not available.',
      },
    })
  }
  expect((await fixture.snapshot()).records).toEqual(before)
  expect(parent.id).not.toBe(other.id)
})

it('accepts a finished agent answer and refuses an answer that is still streaming', async () => {
  const { fixture, parent, explain } = await explanationFixture(harness)
  const answer = {
    sessionId: parent.id,
    turnId: 'parent-turn',
    messageId: 'answer-1',
    text: 'Selected text',
  }
  await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
    type: 'assistant.delta',
    ...answer,
  })
  expect(
    (await explain({ ...EXPLAIN_INPUT, messageId: answer.messageId })).status,
  ).toBe(404)
  await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
    type: 'assistant.completed',
    ...answer,
    userMessageIds: ['parent-message'],
  })
  const response = await explain({
    ...EXPLAIN_INPUT,
    messageId: answer.messageId,
  })
  expect(response.status).toBe(201)
  expect(await response.json()).toMatchObject({
    session: {
      anchor: { parentSessionId: parent.id, messageId: answer.messageId },
    },
  })
})

it('uses the message access checks for archived workspaces and suspended orgs', async () => {
  const { fixture, parent, explain } = await explanationFixture(harness)
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET archived_at = ? WHERE id = ?',
  )
    .bind(TEST_TIME, WORKSPACE_ID)
    .run()
  const before = (await fixture.snapshot()).records
  const archived = await explain()
  expect(archived.status).toBe(409)
  expect(await archived.json()).toEqual({
    error: {
      code: 'workspace_archived',
      message: 'The archived chat is read-only.',
    },
  })
  await fixture.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, fixture.org.id)
    .run()
  const suspended = await explain()
  expect(suspended.status).toBe(403)
  const message = await fixture.fetch(
    sessionPaths.messages(fixture.org.id, WORKSPACE_ID, parent.id),
    { id: 'refused-message', text: 'Hello', choice: CLAUDE, attachmentIds: [] },
  )
  expect(await suspended.json()).toEqual(await message.json())
  expect((await fixture.snapshot()).records).toEqual(before)
})

it('requires the member login before creating the explanation', async () => {
  const { fixture, explain } = await explanationFixture(harness)
  await fixture.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
    .bind(fixture.member.id)
    .run()
  const before = (await fixture.snapshot()).records
  const response = await explain()
  expect(response.status).toBe(409)
  expect(await response.json()).toEqual({
    error: {
      code: 'agent_login_required',
      message: 'Connect your agent login to send a message.',
    },
  })
  expect((await fixture.snapshot()).records).toEqual(before)
})

it('starts an explanation of a closed parent session', async () => {
  const { fixture, parent, explain } = await explanationFixture(harness)
  await fixture.fetch(
    sessionPaths.close(fixture.org.id, WORKSPACE_ID, parent.id),
    { stopRunningTurn: false },
  )
  const response = await explain()
  expect(response.status).toBe(201)
  const reply: ExplainSessionResponse = await response.json()
  expect(reply.session).toMatchObject({
    closedAt: null,
    anchor: { parentSessionId: parent.id },
  })
})

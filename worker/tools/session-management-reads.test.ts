import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentSessionsPath,
  agentSessionPath,
  agentMessagePath,
  agentSessionTranscriptPath,
} from '../../src/shared/agent-session-paths'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { sessionLink } from '../../src/shared/session-link'
import type { AgentListSessionsResponse } from '../../src/shared/generated/AgentListSessionsResponse'
import type { AgentReadSessionResponse } from '../../src/shared/generated/AgentReadSessionResponse'
import type { AgentGetMessageRequest } from '../../src/shared/generated/AgentGetMessageRequest'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record, string } from '../chat/inputs'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'
import {
  machineRead,
  seedOrderedSessions,
} from './session-management.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('pages all sessions in stable creation order with explicit bounds and more flags', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await seedOrderedSessions(active)
  const path = agentSessionsPath(OTHER_WORKSPACE)
  for (const [query, ids, more] of [
    ['', ['closed-session', 'z-session', 'a-session'], undefined],
    ['?limit=1', ['closed-session'], true],
    ['?limit=1&offset=2', ['a-session'], false],
    ['?limit=100', ['closed-session', 'z-session', 'a-session'], false],
    ['?limit=2&offset=3', [], false],
    ['?offset=1', ['z-session', 'a-session'], undefined],
  ] as const) {
    const response = await machineRead(active, path + query)
    expect(response.status).toBe(200)
    const result = record(await response.json())
    if (!Array.isArray(result.sessions)) throw new Error('Missing sessions.')
    expect(
      result.sessions.map((session: unknown) => string(record(session).id)),
      query,
    ).toEqual(ids)
    expect(result.hasMore, query).toBe(more)
  }
  for (const query of [
    '?limit=0',
    '?limit=101',
    '?limit=',
    '?limit=1.5',
    '?offset=-1',
    '?offset=word',
  ]) {
    const response = await machineRead(active, path + query)
    expect(response.status, query).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
})

it('gets exact session and stored-message facts across workspaces and permits removed session reads', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const createdResponse = await active.post(
    agentSessionsPath(OTHER_WORKSPACE),
    {
      title: 'Receiving',
      firstMessage: 'Read this stored task',
      requestId: 'read-message',
    },
  )
  expect(createdResponse.status).toBe(201)
  const created = record(await createdResponse.json())
  const sessionId = string(record(created.session).id)
  const message = record(created.message)
  const messageId = string(message.id)
  const response = await machineRead(
    active,
    agentSessionPath(OTHER_WORKSPACE, sessionId),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    workspace: { id: OTHER_WORKSPACE },
    session: {
      id: sessionId,
      title: 'Receiving',
      state: 'running',
      closed: false,
      startedBy: { id: 'member' },
    },
  })
  const read = await machineRead(
    active,
    agentMessagePath(OTHER_WORKSPACE, sessionId, messageId),
  )
  expect(read.status).toBe(200)
  expect(await read.json()).toMatchObject({
    session: { id: sessionId },
    turnId: created.turnId,
    message: {
      id: messageId,
      sessionId,
      sender: { id: 'member' },
      text: `Read this stored task\n\n---\nSent by: ${sessionLink(active.env.APP_ORIGIN, 'chat-org', OUTER_WORKSPACE, active.sourceSessionId)}`,
      state: 'queued',
      createdAt: DEVICE_TEST_NOW,
    },
  })
  const otherSessionId = await active.createSession(OTHER_WORKSPACE)
  for (const [selectedSession, selectedMessage, code] of [
    [otherSessionId, messageId, 'message_not_found'],
    [sessionId, 'missing', 'message_not_found'],
    ['missing-session', messageId, 'session_not_found'],
  ]) {
    const missing = await machineRead(
      active,
      agentMessagePath(OTHER_WORKSPACE, selectedSession, selectedMessage),
    )
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code } })
  }
  await active.env.DB.prepare(
    "UPDATE workspaces SET archived_at = ?, state = 'archived', sandbox_id = NULL WHERE id = ?",
  )
    .bind(DEVICE_TEST_NOW - WORKSPACE_RESTORE_MS, OTHER_WORKSPACE)
    .run()
  expect(
    (await machineRead(active, agentSessionPath(OTHER_WORKSPACE, sessionId)))
      .status,
  ).toBe(200)
  const listedResponse = await machineRead(
    active,
    agentSessionsPath(OTHER_WORKSPACE),
  )
  expect(listedResponse.status).toBe(200)
  const listed = (await listedResponse.json()) as AgentListSessionsResponse
  expect(listed.workspace).toMatchObject({
    id: OTHER_WORKSPACE,
    state: 'archived',
  })
  // Both sessions share the fixed clock, so their order follows their random IDs.
  expect(listed.sessions.map(({ id }) => id).sort()).toEqual(
    [sessionId, otherSessionId].sort(),
  )
  const transcriptResponse = await machineRead(
    active,
    agentSessionTranscriptPath(OTHER_WORKSPACE, sessionId),
  )
  expect(transcriptResponse.status).toBe(200)
  const transcript =
    (await transcriptResponse.json()) as AgentReadSessionResponse
  expect(transcript.workspace).toMatchObject({
    id: OTHER_WORKSPACE,
    state: 'archived',
  })
  expect(transcript.session.id).toBe(sessionId)
  expect(transcript.markdown).toContain('Read this stored task')
  expect(
    (
      await machineRead(
        active,
        agentMessagePath(OTHER_WORKSPACE, sessionId, messageId),
      )
    ).status,
  ).toBe(200)
  const wrongWorkspace = await machineRead(
    active,
    agentSessionPath(OUTER_WORKSPACE, sessionId),
  )
  expect(wrongWorkspace.status).toBe(404)
  expect(await wrongWorkspace.json()).toMatchObject({
    error: { code: 'session_not_found' },
  })
  expect(
    await (
      await active.actor(OTHER_WORKSPACE)
    ).getAgentSession(
      'other-org',
      OTHER_WORKSPACE,
      sessionId,
      active.env.APP_ORIGIN,
    ),
  ).toMatchObject({ ok: false, error: { code: 'workspace_not_found' } })
})

it('gets a finished agent message only for a caller that reads agent messages', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const runner = active.sourceRunner
  const answer = {
    sessionId: active.sourceSessionId,
    turnId: active.sourceTurnId,
    messageId: 'answer-1',
    text: 'Finished answer',
  }
  const reads: Record<keyof AgentGetMessageRequest, string> = {
    agentMessages: 'true',
  }
  const path = (sessionId: string) =>
    `${agentMessagePath(OUTER_WORKSPACE, sessionId, answer.messageId)}?${new URLSearchParams(reads)}`
  runner.emit({ type: 'assistant.delta', ...answer })
  await runner.inbox.next()
  const streaming = await machineRead(active, path(answer.sessionId))
  expect(streaming.status).toBe(404)
  expect(await streaming.json()).toMatchObject({
    error: { code: 'message_not_found' },
  })
  const completed = runner.emit({
    type: 'assistant.completed',
    ...answer,
    userMessageIds: ['member-starting-message'],
  })
  await runner.inbox.next()
  const read = await machineRead(active, path(answer.sessionId))
  expect(read.status).toBe(200)
  expect(await read.json()).toMatchObject({
    session: {
      id: answer.sessionId,
      link: sessionLink(
        active.env.APP_ORIGIN,
        OUTER_ORG,
        OUTER_WORKSPACE,
        answer.sessionId,
      ),
    },
    message: {
      author: 'agent',
      id: 'answer-1',
      sessionId: answer.sessionId,
      text: 'Finished answer',
      createdAt: completed.occurredAt,
    },
    turnId: answer.turnId,
  })
  const otherSessionId = await active.createSession(OUTER_WORKSPACE)
  for (const missingPath of [
    agentMessagePath(OUTER_WORKSPACE, answer.sessionId, answer.messageId),
    path(otherSessionId),
  ]) {
    const missing = await machineRead(active, missingPath)
    expect(missing.status, missingPath).toBe(404)
    expect(await missing.json()).toMatchObject({
      error: { code: 'message_not_found' },
    })
  }
  // The previous Worker calls the workspace object with no request input.
  expect(
    await (
      await active.actor(OUTER_WORKSPACE)
    ).getAgentMessage(
      OUTER_ORG,
      OUTER_WORKSPACE,
      answer.sessionId,
      answer.messageId,
      active.env.APP_ORIGIN,
    ),
  ).toMatchObject({ ok: false, error: { code: 'message_not_found' } })
})

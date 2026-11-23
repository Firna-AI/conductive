import { expect } from 'vitest'

import { TOOL_TURN_HEADER } from '../../src/shared/agent-tools'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionTranscriptPath } from '../../src/shared/sessions'
import { agentWakeUpPaths } from '../../src/shared/wake-up-paths'
import { readNewestStoredEvents } from '../../src/chat/api/read-workspace'
import { readSessionWakeUps } from '../../src/chat/api/read-wake-up'
import { CLAUDE } from '../chat/harness.test-support'
import { record } from '../chat/inputs'
import { OUTER_MACHINE_ORIGIN } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import type { AgentWriteFixture } from './agent-session-writes.test-support'

export async function readyWakeCaller(
  active: AgentWriteFixture,
  sandbox: string,
) {
  const actor = await active.actor()
  await active.env.DB.batch([
    active.env.DB.prepare(
      'UPDATE workspace_runtime SET created_by_user_id = ?, session_id = ?, first_turn_id = ?, first_message_id = ? WHERE workspace_id = ?',
    ).bind(
      'member',
      active.sourceSessionId,
      active.sourceTurnId,
      'member-starting-message',
      OUTER_WORKSPACE,
    ),
    active.env.DB.prepare(
      'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
    ).bind(sandbox, OUTER_WORKSPACE),
  ])
  active.boat.states.set(sandbox, 'running')
  await actor.initializeLifecycle({
    workspaceId: OUTER_WORKSPACE,
    orgId: OUTER_ORG,
    firstMessage: {
      id: 'member-starting-message',
      text: 'Start this turn',
      choice: CLAUDE,
      attachmentIds: [],
    },
    firstTurn: {
      sessionId: active.sourceSessionId,
      turnId: active.sourceTurnId,
      senderUserId: 'member',
    },
  })
  await actor.beginLifecycleStart('create')
  await actor.lifecyclePrepared()
  await actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await actor.acknowledgeLifecycleFirstMessage()
  return actor
}

export function getTool(active: AgentWriteFixture, path: string) {
  return active.runtime.dispatchFetch(`${OUTER_MACHINE_ORIGIN}${path}`, {
    headers: { Authorization: `Bearer ${OUTER_TOKEN}` },
  })
}

export function invokeTool(
  active: AgentWriteFixture,
  path: string,
  token: string,
  turnId: string,
  body: unknown,
) {
  return active.runtime.dispatchFetch(`${OUTER_MACHINE_ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      [TOOL_TURN_HEADER]: turnId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export async function scheduleWakeUp(
  active: AgentWriteFixture,
  input: { text: string } & ({ at: number } | { delaySeconds: number }),
) {
  const reply = await active.post(agentWakeUpPaths.schedule, input)
  expect(reply.status).toBe(200)
  const result = record(await reply.json())
  return {
    ...result,
    wakeUp: readSessionWakeUps({
      eventNumber: 0,
      wakeUps: [result.wakeUp],
    }).wakeUps[0],
  }
}

export async function wakeUpEvents(active: AgentWriteFixture) {
  const reply = await active.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId),
  )
  expect(reply.status).toBe(200)
  return readNewestStoredEvents(await reply.json())
    .envelopes.map(({ event }) => event)
    .filter(
      (event) =>
        event?.type === 'session.wake-up-scheduled' ||
        event?.type === 'session.wake-up-fired' ||
        event?.type === 'session.wake-up-ended',
    )
}

export async function wakeUpTranscript(
  active: AgentWriteFixture,
): Promise<string> {
  const reply = await active.request(
    sessionTranscriptPath(
      OUTER_ORG,
      OUTER_WORKSPACE,
      active.sourceSessionId,
      'full',
    ),
  )
  expect(reply.status).toBe(200)
  const value = record(await reply.json()).markdown
  if (typeof value !== 'string') throw new Error('The transcript is missing.')
  return value
}

export async function endCallingTurn(
  active: AgentWriteFixture,
  turnId = active.sourceTurnId,
  messageId = 'member-starting-message',
) {
  active.sourceRunner.emit({
    type: 'turn.completed',
    sessionId: active.sourceSessionId,
    turnId,
    state: 'finished',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [messageId],
  })
  expect(await active.sourceRunner.inbox.next()).toMatchObject({
    type: 'confirm',
  })
}

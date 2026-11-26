import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { agentSessionPaths } from '../../src/shared/agent-session-paths'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionLink } from '../../src/shared/session-link'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
  OTHER_WORKSPACE,
  OTHER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  driveWorkspaceStart,
  prepareWorkspaceStart,
} from '../chat/integration/workspace-start.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'
import type { Workspace } from './entry.test-support'
import { readWorkspace } from '../lifecycle/workspace-data'
import type { WorkspaceStartResult } from '../lifecycle/start-types'
import { providerForAccount } from '../sandbox/client'

let bundle: string
let fixture: AgentWriteFixture | undefined
let active: AgentWriteFixture
let watched: Awaited<ReturnType<typeof target>>
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})
beforeEach(async () => {
  active = fixture = await agentWriteFixture(bundle)
})
beforeEach(async () => {
  watched = await target(active)
})

async function target(active: AgentWriteFixture) {
  const sessionId = await active.createSession(
    OTHER_WORKSPACE,
    active.cookies.ownerCookie,
  )
  const runner = await active.connect(OTHER_WORKSPACE, OTHER_TOKEN)
  const turnId = await active.start(
    OTHER_WORKSPACE,
    sessionId,
    runner,
    'owner',
    active.cookies.ownerCookie,
  )
  const actor = await active.actor(OTHER_WORKSPACE)
  await active.env.DB.prepare(
    'UPDATE workspace_runtime SET session_id = ?, first_turn_id = ?, first_message_id = ? WHERE workspace_id = ?',
  )
    .bind(sessionId, turnId, 'owner-starting-message', OTHER_WORKSPACE)
    .run()
  await actor.initializeLifecycle({
    workspaceId: OTHER_WORKSPACE,
    orgId: OUTER_ORG,
    firstMessage: {
      id: 'owner-starting-message',
      text: 'Start this turn',
      choice: CLAUDE,
      attachmentIds: [],
    },
    firstTurn: { sessionId, turnId, senderUserId: 'owner' },
  })
  await actor.beginLifecycleStart('create')
  await actor.lifecyclePrepared()
  await actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await actor.acknowledgeLifecycleFirstMessage()
  const response = await active.post(
    agentSessionPaths.watch(OTHER_WORKSPACE, sessionId),
    { turnId },
  )
  expect(response.status).toBe(200)
  const watchId = string(record(await response.json()).watchId)
  return {
    sessionId,
    turnId,
    runner,
    watchId,
    actor,
  }
}

async function notice(
  active: AgentWriteFixture,
  actor: DurableObjectStub<Workspace>,
  watchId: string,
) {
  const receipt = await actor.sessionWatchReceipt(watchId)
  expect(receipt).toMatchObject({ state: 'accepted' })
  if (receipt?.state !== 'accepted')
    throw new Error('The watch receipt is missing.')
  const response = await active.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId),
    { headers: { Cookie: active.cookies.memberCookie } },
  )
  expect(response.status).toBe(200)
  const events = record(await response.json()).events
  if (!Array.isArray(events)) throw new Error('The history is missing.')
  return {
    receipt,
    event: events
      .map(record)
      .map((entry) => record(entry.event))
      .find((event) => event.type === 'session.watch-notice'),
  }
}

describe('normal watch resume', () => {
  let caller: DurableObjectStub<Workspace>
  beforeEach(async () => {
    caller = await active.actor()
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
      ).bind('bx_watch_caller', OUTER_WORKSPACE),
    ])
    active.boat.states.set('bx_watch_caller', 'running')
    await caller.initializeLifecycle({
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
    await caller.beginLifecycleStart('create')
    await caller.lifecyclePrepared()
    await caller.reportRunnerLifecycle({ type: 'runner.ready' })
    await caller.acknowledgeLifecycleFirstMessage()
    active.sourceRunner.emit({
      type: 'turn.completed',
      sessionId: active.sourceSessionId,
      turnId: active.sourceTurnId,
      state: 'finished',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['member-starting-message'],
    })
    await active.sourceRunner.inbox.next()
    const row = await readWorkspace(active.env.DB, OUTER_ORG, OUTER_WORKSPACE)
    if (!row.sandboxId) throw new Error('The caller computer is missing.')
    await providerForAccount(
      active.env,
      active.boat.fetch,
      row.providerAccount,
    ).stop(row.sandboxId)
    await closeSockets(active.sourceRunner.socket)
    await caller.lifecycleStopped()
  })

  it('resumes a stopped caller through normal admission and delivers ordinary runner text for the setter', async () => {
    watched.runner.emit({
      type: 'turn.completed',
      sessionId: watched.sessionId,
      turnId: watched.turnId,
      state: 'finished',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['owner-starting-message'],
    })
    await watched.runner.inbox.next()
    await watched.actor.advanceStartAlarm()
    const accepted = await notice(active, caller, watched.watchId)
    expect(await caller.readLifecycle()).toMatchObject({
      state: 'starting',
      start: { kind: 'resume' },
    })
    expect(active.boat.resumeIds).toEqual([])
    await caller.advanceStartAlarm()
    expect(active.boat.resumeIds).toEqual(['bx_watch_caller'])
    await prepareWorkspaceStart(caller)
    const connected = await requestRunner(active)
    if (!connected.webSocket)
      throw new Error('The resumed runner socket is missing.')
    try {
      const runner = new OuterFakeRunner(connected.webSocket, OUTER_WORKSPACE, {
        streamId: 'watch-resume',
      })
      await runner.inbox.next()
      runner.emit({ type: 'runner.ready' })
      expect(await runner.inbox.next()).toMatchObject({
        type: 'confirm',
        throughEventNumber: 1,
      })
      expect(
        await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
          caller,
          caller.waitLifecycleStart(),
        ),
      ).toEqual({ ok: true })
      const command = await runner.waitForTurn(string(accepted.event?.turnId))
      expect(command).toMatchObject({
        type: 'turn',
        sessionId: active.sourceSessionId,
        message: {
          sender: { id: 'member' },
          text: `A turn finished in ${sessionLink(active.env.APP_ORIGIN, OUTER_ORG, OTHER_WORKSPACE, watched.sessionId)}`,
        },
      })
    } finally {
      await closeSockets(connected.webSocket)
    }
  })
})

it('delivers an accepted target watch after archive and owner suspension without target access checks', async () => {
  await active.env.DB.batch([
    active.env.DB.prepare(
      'UPDATE workspaces SET owner_user_id = ? WHERE id = ?',
    ).bind('member', OUTER_WORKSPACE),
    active.env.DB.prepare(
      'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
    ).bind(OTHER_WORKSPACE),
    active.env.DB.prepare(
      "UPDATE users SET suspended_at = 1 WHERE id = 'owner'",
    ),
  ])
  await watched.actor.lifecycleStopped()
  await watched.actor.advanceStartAlarm()
  const accepted = await notice(active, await active.actor(), watched.watchId)
  expect(accepted.event).toMatchObject({
    state: 'stopped',
    watchedTurnId: watched.turnId,
    turnId: active.sourceTurnId,
  })
  expect(record(await active.sourceRunner.inbox.next())).toMatchObject({
    type: 'message',
    turnId: active.sourceTurnId,
    message: { sender: { id: 'member' } },
  })
  expect(active.boat.resumeIds).toEqual([])
})

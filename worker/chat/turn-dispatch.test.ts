import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { backendPlatform } from '../lifecycle/backend-test-platform'
import { LifecycleBoat } from '../lifecycle/lifecycle-boat-test-support'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'

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

it('undoes dispatch registration when the runner disconnects before the send', async () => {
  let releaseDispatch = () => {}
  let enteredDispatch = () => {}
  const held = new Promise<void>((resolve) => {
    releaseDispatch = resolve
  })
  const entered = new Promise<void>((resolve) => {
    enteredDispatch = resolve
  })
  const failed: string[] = []
  const fixture = await createChatFixture(harness, {
    runnerReady: async () => {
      await controller.reportRunnerLifecycle({ type: 'runner.ready' })
    },
    runnerDisconnected: async () => {
      await controller.runnerLifecycleDisconnected()
    },
    turnDispatching: async (_id, turn) => {
      await controller.registerLifecycleTurn(turn)
      enteredDispatch()
      await held
      return true
    },
    turnDispatchFailed: async (_id, turnId) => {
      failed.push(turnId)
      await controller.finishLifecycleTurn(turnId)
    },
  })
  const boat = new LifecycleBoat()
  boat.states.set('bx_dispatch', 'ready')
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('bx_dispatch', WORKSPACE_ID)
    .run()
  const controller: WorkspaceController = backendPlatform(
    fixture.env,
    {
      fetch: boat.fetch,
      now: fixture.clock.now,
      randomToken: () => 'dispatch-token',
    },
    () => {},
  ).endpoint()
  const session = await fixture.createSession()
  const accepted = await fixture.send(session.id)
  const turnId = accepted.session.activeTurnId
  if (!turnId) throw new Error('The queued turn is missing.')
  await fixture.env.DB.prepare(
    `INSERT INTO workspace_runtime
    (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
    VALUES (?, ?, ?, ?, ?, 'claude', 'test-claude', 'high', 'message-1')`,
  )
    .bind(WORKSPACE_ID, fixture.org.id, fixture.owner.id, session.id, turnId)
    .run()
  await controller.initializeLifecycle({
    workspaceId: WORKSPACE_ID,
    orgId: fixture.org.id,
    firstMessage: {
      id: 'message-1',
      text: 'Check this code',
      choice: CLAUDE,
      attachmentIds: [],
    },
    firstTurn: {
      turnId,
      sessionId: session.id,
      senderUserId: fixture.owner.id,
    },
  })
  await controller.beginLifecycleStart('create')
  await controller.lifecyclePrepared()
  const runner = await fixture.connect()
  try {
    runner.emit({ type: 'runner.ready' })
    await entered
    expect(await controller.readLifecycle()).toMatchObject({
      state: 'working',
      runningSessions: [session.id],
    })
    runner.disconnect()
    releaseDispatch()
    await fixture.drain()
    expect(runner.commands).toEqual([])
    expect(failed).toEqual([turnId])
    expect(await controller.readLifecycle()).toMatchObject({
      state: 'ready',
      runningSessions: [],
      runnerConnected: false,
    })
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.turn(turnId)),
    ).toMatchObject({ state: 'queued' })
    const stopped = await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId },
    )
    expect(stopped.status).toBe(200)
    boat.deadlineIds.length = 0
    await controller.alarm()
    expect(boat.deadlineIds).toEqual([])
  } finally {
    releaseDispatch()
    runner.disconnect()
    await fixture.drain()
  }
})

import { expect } from 'vitest'

import type { SessionWatchNotice } from '../../src/shared/generated/SessionWatchNotice'
import type { UserMessage } from '../../src/shared/generated/UserMessage'
import { sessionPaths } from '../../src/shared/sessions'
import { requireFeatureResult } from '../features/result'
import type { TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'

export async function watchFixture(harness: TestHarness, memberCaller = false) {
  const f = await createChatFixture(harness)
  const runner = await f.connect()
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  const source = await f.createSession()
  const startCaller = async () => {
    await f.send(source.id, 'calling-message', f.memberCookie)
    const command = messageCommands(runner, 'calling-message')[0]
    if (command?.type !== 'turn')
      throw new Error('The calling command is missing.')
    runner.emit({
      type: 'turn.started',
      sessionId: source.id,
      turnId: command.turnId,
      senderId: f.member.id,
      choice: CLAUDE,
      startedAt: f.clock.now(),
      messageIds: ['calling-message'],
    })
    await f.drain()
    return command
  }
  const calling = memberCaller
    ? await startCaller()
    : await startTurn(f, runner, source.id, 'calling-message')
  await f.env.DB.prepare(
    `INSERT INTO workspace_runtime
    (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
    VALUES (?, ?, ?, ?, ?, 'claude', 'test-claude', 'high', 'calling-message')`,
  )
    .bind(
      WORKSPACE_ID,
      f.org.id,
      memberCaller ? f.member.id : f.owner.id,
      source.id,
      calling.turnId,
    )
    .run()
  const { target, watched } = await f.changeWorkspace(
    WORKSPACE_ID,
    async (view) => {
      const session = await view.session(source.id)
      if (!session?.startedBy) throw new Error('The caller session is missing.')
      const target = {
        ...session,
        id: 'watch-target-session',
        activeTurnId: 'watch-target-turn',
      }
      const message: UserMessage = {
        ...calling.message,
        id: 'watched-message',
        sessionId: target.id,
        sender: session.startedBy,
        state: 'sent',
      }
      await view.saveSession(target)
      await view.saveTurn({
        id: 'watch-target-turn',
        sessionId: target.id,
        senderId: f.owner.id,
        messageIds: [message.id],
        state: 'running',
        started: true,
        startedAt: f.clock.now(),
        closeAfterStop: false,
        stopRequest: null,
      })
      await view.saveMessage(message)
      await view.saveMessageTurn(message.id, 'watch-target-turn')
      await view.saveNewestTurn(target.id, 'watch-target-turn')
      await view.emit({ type: 'session.updated', session: target })
      await view.emit({
        type: 'turn.started',
        sessionId: target.id,
        turnId: 'watch-target-turn',
        senderId: f.owner.id,
        choice: CLAUDE,
        startedAt: f.clock.now(),
        messageIds: [message.id],
      })
      return {
        target,
        watched: {
          ...calling,
          sessionId: target.id,
          turnId: 'watch-target-turn',
          message,
        },
      }
    },
  )
  const caller = await f.actor.rpc.callingWatchTurn(
    WORKSPACE_ID,
    calling.turnId,
  )
  if (!caller) throw new Error('The calling turn is missing.')
  const register = async (turnId: string | undefined = watched.turnId) =>
    requireFeatureResult(
      await f.actor.rpc.watchAgentSession({
        orgId: f.org.id,
        workspaceId: WORKSPACE_ID,
        sessionId: target.id,
        caller,
        ...(turnId === undefined ? {} : { turnId }),
      }),
    )
  const watch = await register()
  if (watch.state !== 'watching') throw new Error('The watch was not recorded.')
  const notices = async (): Promise<SessionWatchNotice[]> => {
    const result: SessionWatchNotice[] = []
    let after = 0
    for (;;) {
      const page = await f.actor.api.controls.history(WORKSPACE_ID, after)
      for (const { event } of page.events)
        if (
          event.type === 'session.watch-notice' &&
          event.sessionId === source.id
        )
          result.push(event)
      if (!page.hasMore) return result
      after = page.nextAfterEventNumber
    }
  }
  const fire = async () => {
    await f.actor.api.controls.dispatchAlarm()
    await f.actor.api.controls.drainBackground()
    await f.drain()
  }
  const finishCaller = async () => {
    runner.emit(terminalEvent(calling, 'finished'))
    await f.drain()
  }
  const finishTarget = async (state: 'finished' | 'failed' | 'stopped') => {
    const envelope = runner.emit(terminalEvent(watched, state))
    await f.drain()
    return envelope
  }
  const ready = async () => {
    const record = await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.watches.target(watch.watchId),
    )
    if (record?.stage !== 'ready') throw new Error('The watch is not ready.')
    return record
  }
  const receipt = () =>
    f.chat.store.read(WORKSPACE_ID, (view) =>
      view.watches.receipt(watch.watchId),
    )
  const stop = async (sessionId = source.id, turnId = calling.turnId) => {
    const response = await f.fetch(
      sessionPaths.interrupt(f.org.id, WORKSPACE_ID, sessionId),
      { turnId },
    )
    expect(response.status).toBe(200)
  }
  return {
    ...f,
    runner,
    source,
    target,
    calling,
    watched,
    caller,
    watch,
    register,
    notices,
    fire,
    finishCaller,
    finishTarget,
    ready,
    receipt,
    stop,
  }
}

export type WatchFixture = Awaited<ReturnType<typeof watchFixture>>

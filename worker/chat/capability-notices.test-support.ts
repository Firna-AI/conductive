import { expect } from 'vitest'

import type { CapabilityChangeNote } from '../../src/shared/capability-change'
import type { RunnerTurn } from '../../src/shared/generated/RunnerTurn'
import type { UpdateWorkspaceCapabilitiesRequest } from '../../src/shared/secrets'
import { workspaceCapabilitiesPath } from '../../src/shared/secrets'
import { FakeRunner } from '../test-support/fake-runner'
import type { TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

export async function noticeFixture(harness: TestHarness, capable = true) {
  const f = await createChatFixture(harness)
  harness.env.WORKSPACES = harness.native.bindings.WORKSPACES
  const runner = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, capabilityNotices: capable }),
  )
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  const patch = async (
    change: UpdateWorkspaceCapabilitiesRequest,
    cookie = f.ownerCookie,
  ) => {
    const response = await harness.request(
      workspaceCapabilitiesPath(f.org.id, WORKSPACE_ID),
      cookie,
      { method: 'PATCH', body: JSON.stringify(change) },
    )
    expect(response.status).toBe(200)
    await f.drain()
    return response
  }
  const acknowledgeStart = async (command: RunnerTurn) => {
    runner.emit({
      type: 'turn.started',
      sessionId: command.sessionId,
      turnId: command.turnId,
      senderId: f.owner.id,
      choice: command.message.choice,
      startedAt: f.clock.now(),
      messageIds: [command.message.id],
    })
    await f.drain()
  }
  const answer = async (turn: RunnerTurn, noticeIds: readonly string[]) => {
    runner.emit({
      type: 'assistant.completed',
      sessionId: turn.sessionId,
      turnId: turn.turnId,
      messageId: `answer-${turn.turnId}`,
      text: 'Ready.',
      userMessageIds: [turn.message.id],
      noticeIds,
    })
    await f.drain()
  }
  const start = async (sessionId: string, messageId: string) => {
    await f.send(sessionId, messageId)
    const command = runner.commands.at(-1)
    if (command?.type !== 'turn') throw new Error('The turn is missing.')
    await acknowledgeStart(command)
    return command
  }
  const finish = async (turn: RunnerTurn, noticeIds?: readonly string[]) => {
    runner.emit({
      type: 'turn.completed',
      sessionId: turn.sessionId,
      turnId: turn.turnId,
      state: 'finished',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [turn.message.id],
      ...(noticeIds ? { noticeIds } : {}),
    })
    await f.drain()
  }
  const notes = async (sessionId: string) =>
    (await f.history(sessionId)).events.filter(
      ({ event }) => event.type === 'capabilities.changed',
    )
  const waitingNotes = (sessionId: string) =>
    f.chat.readWorkspace(WORKSPACE_ID, (view) =>
      view.capabilityNotes.waiting(sessionId),
    )
  let nextNoteId = 0
  const seedNotes = async (
    sessionIds: readonly string[],
    changes: CapabilityChangeNote['changes'],
  ) => {
    await f.chat.changeWorkspace(WORKSPACE_ID, async (view) => {
      for (const sessionId of sessionIds)
        await view.emit({
          type: 'capabilities.changed',
          sessionId,
          noteId: `seeded-note-${nextNoteId++}`,
          member: {
            id: f.owner.id,
            githubLogin: 'octocat',
            displayName: 'Octocat',
            avatarUrl: null,
          },
          changes,
        })
    })
    await f.chat.flushRunner()
    await f.drain()
  }
  return {
    ...f,
    runner,
    patch,
    start,
    finish,
    notes,
    acknowledgeStart,
    answer,
    waitingNotes,
    seedNotes,
  }
}

import type { AgentChatEvent } from '../../src/shared/chat-events'
import type {
  RunnerMessageDuringTurn,
  RunnerTurn,
} from '../../src/shared/runner'
import type { FakeRunner } from '../test-support/fake-runner'
import { TEST_TIME } from '../test-support/harness'
import { CLAUDE, type ChatFixture } from './harness.test-support'

export function messageCommands(
  runner: FakeRunner,
  id: string,
): (RunnerTurn | RunnerMessageDuringTurn)[] {
  return runner.commands.filter(
    (command): command is RunnerTurn | RunnerMessageDuringTurn =>
      (command.type === 'turn' || command.type === 'message') &&
      command.message.id === id,
  )
}

export async function startTurn(
  fixture: ChatFixture,
  runner: FakeRunner,
  sessionId: string,
  messageId: string,
): Promise<RunnerTurn> {
  await fixture.send(sessionId, messageId)
  const command = messageCommands(runner, messageId)[0]
  if (command?.type !== 'turn')
    throw new Error('The first message did not start a turn.')
  runner.emit({
    type: 'turn.started',
    sessionId,
    turnId: command.turnId,
    senderId: fixture.owner.id,
    choice: CLAUDE,
    startedAt: TEST_TIME,
    messageIds: [messageId],
  })
  await fixture.drain()
  return command
}

export function terminalEvent(
  turn: RunnerTurn,
  state: 'stopped' | 'failed' | 'finished',
): AgentChatEvent {
  const context = { sessionId: turn.sessionId, turnId: turn.turnId }
  return state === 'failed'
    ? {
        ...context,
        type: 'turn.failed',
        error: { code: 'agent_unavailable', message: 'Try again.' },
        retryMessageId: turn.message.id,
        durationMs: 25,
      }
    : {
        ...context,
        type: 'turn.completed',
        state,
        durationMs: 25,
        files: [
          { path: 'changed.ts', change: 'modified', added: 2, removed: 1 },
        ],
        omittedFileCount: 0,
        userMessageIds: [turn.message.id],
      }
}

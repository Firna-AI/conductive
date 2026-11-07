import type {
  AgentChatEvent,
  RunnerEventRefused,
  ToolCall,
} from '../../shared/chat-events'
import { FAKE_IDS } from '../../test-support/fixtures/core'

/** The session and the turn of the recorded chats that the tests extend. */
export const turn = { sessionId: FAKE_IDS.session, turnId: 'turn-1' }

/** The runner stream of the markers, which no line may show. */
export const streamId = 'stream-7f3a'

/** A tool update of the turn, with the output that its detail left out. */
export function update(
  id: string,
  target: string,
  omittedDetailBytes: number,
  state: ToolCall['state'] = 'done',
): AgentChatEvent {
  const tool: ToolCall = {
    id,
    kind: 'run',
    target,
    detail: null,
    omittedDetailBytes,
    state,
  }
  return { ...turn, type: 'tool.updated', tool }
}

/** A refusal marker of the session, for the turn unless `fields` says. */
export function refused(
  runnerEventNumber: number,
  runnerEventType: RunnerEventRefused['runnerEventType'],
  reason: RunnerEventRefused['reason'],
  fields: Partial<RunnerEventRefused> = {},
): RunnerEventRefused {
  return {
    ...turn,
    type: 'runner.event-refused',
    streamId,
    runnerEventNumber,
    runnerEventType,
    reason,
    ...fields,
  }
}

/** How many times a part shows in a text. */
export const count = (text: string, part: string) => text.split(part).length - 1

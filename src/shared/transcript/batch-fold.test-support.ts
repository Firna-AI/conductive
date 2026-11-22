import type { AgentChatEvent } from '../generated/AgentChatEvent'
import type { Session } from '../generated/Session'
import type { UserMessage } from '../generated/UserMessage'
import type { ChatEnvelope, SessionEvent } from './session-events'

const choice = {
  agent: 'codex',
  model: 'test-model',
  effort: 'high',
  fast: false,
} as const

const sender = {
  id: 'member',
  displayName: 'Member',
  githubLogin: 'member',
  avatarUrl: null,
}

export const session: Session = {
  id: 'session',
  workspaceId: 'workspace',
  title: 'Transcript',
  choice,
  createdAt: 0,
  closedAt: null,
  activeTurnId: null,
  activeTurnStartedAt: null,
  retryMessageId: null,
  startedBy: sender,
  sourceSessionId: null,
  loginAvailable: true,
  loginShared: true,
}

export function message(id: string): UserMessage {
  return {
    id,
    sessionId: session.id,
    sender,
    text: `Request ${id}`,
    choice,
    attachments: [],
    createdAt: 1,
    state: 'queued',
  }
}

export const context = (turnId: string) => ({
  sessionId: session.id,
  turnId,
})

export function start(
  turnId: string,
  messageIds = [turnId],
): Extract<AgentChatEvent, { type: 'turn.started' }> {
  return {
    ...context(turnId),
    type: 'turn.started',
    messageIds,
    choice,
    senderId: sender.id,
    startedAt: 2,
  }
}

export function complete(
  turnId: string,
): Extract<AgentChatEvent, { type: 'turn.completed' }> {
  return {
    ...context(turnId),
    type: 'turn.completed',
    state: 'finished',
    durationMs: 3,
    files: [],
    omittedFileCount: 2,
    userMessageIds: [turnId],
  }
}

export function envelope(
  eventNumber: number,
  event: SessionEvent,
  late = false,
): ChatEnvelope {
  return { eventNumber, occurredAt: eventNumber * 10, event, late }
}

export function compacted(turns: number): ChatEnvelope[] {
  const events: SessionEvent[] = []
  for (let index = 0; index < turns; index += 1) {
    const id = `turn-${index}`
    events.push(
      { type: 'message.accepted', message: message(id) },
      start(id),
      {
        ...context(id),
        type: 'tool.updated',
        tool: {
          id: 'tool',
          kind: 'run',
          target: 'check',
          detail: 'Output',
          omittedDetailBytes: 3,
          state: 'running',
        },
      },
      {
        ...context(id),
        type: 'assistant.completed',
        messageId: 'answer',
        text: `Answer ${index}`,
        userMessageIds: [id],
      },
      complete(id),
    )
  }
  return events.map((event, index) => envelope(index + 1, event))
}

import type { Agent, AgentChoice, Effort } from '../../shared/agents'
import {
  readImportSessionMetadata,
  type ImportSessionMetadata,
} from '../../shared/import-session'
import type {
  Attachment,
  MessageDraft,
  MessageSender,
  UserMessage,
} from '../../shared/messages'
import type { Session } from '../../shared/sessions'
import {
  count,
  flag,
  list,
  nullable,
  oneOf,
  record,
  text,
  UnreadableResponse,
} from './json'

export const readAgent = oneOf<Agent>({ claude: true, codex: true })
export const readEffort = oneOf<Effort>({
  none: true,
  low: true,
  medium: true,
  high: true,
  xhigh: true,
  max: true,
})

export function readChoice(value: unknown): AgentChoice {
  const source = record(value, 'choice')
  return {
    agent: readAgent(source.agent),
    model: text(source.model),
    effort: readEffort(source.effort),
  }
}

export function readSender(value: unknown): MessageSender {
  const source = record(value, 'sender')
  return {
    id: text(source.id),
    githubLogin: text(source.githubLogin),
    displayName: nullable(text)(source.displayName),
    avatarUrl: nullable(text)(source.avatarUrl),
  }
}

export function readAttachment(value: unknown): Attachment {
  const source = record(value, 'attachment')
  return {
    id: text(source.id),
    name: text(source.name),
    kind: oneOf<Attachment['kind']>({ image: true, file: true })(source.kind),
    mediaType: text(source.mediaType),
    sizeBytes: count(source.sizeBytes),
  }
}

export function readUserMessage(value: unknown): UserMessage {
  const source = record(value, 'message')
  return {
    id: text(source.id),
    sessionId: text(source.sessionId),
    sender: readSender(source.sender),
    text: text(source.text),
    attachments: list(readAttachment)(source.attachments),
    choice: readChoice(source.choice),
    createdAt: count(source.createdAt),
    state: oneOf<UserMessage['state']>({ queued: true, sent: true })(
      source.state,
    ),
  }
}

export function readDraft(value: unknown): MessageDraft {
  const source = record(value, 'draft')
  return {
    text: text(source.text),
    attachmentIds: list(text)(source.attachmentIds),
  }
}

/**
 * The old session from Conductor that a session continues: its old
 * document, and whether its agent got its history.
 */
function readImportSession(value: unknown): ImportSessionMetadata {
  try {
    return readImportSessionMetadata(value)
  } catch {
    throw new UnreadableResponse('conductorImport')
  }
}

export function readSession(value: unknown): Session {
  const source = record(value, 'session')
  return {
    id: text(source.id),
    workspaceId: text(source.workspaceId),
    title: nullable(text)(source.title),
    choice: readChoice(source.choice),
    createdAt: count(source.createdAt),
    closedAt: nullable(count)(source.closedAt),
    activeTurnId: nullable(text)(source.activeTurnId),
    activeTurnStartedAt: nullable(count)(source.activeTurnStartedAt),
    retryMessageId: nullable(text)(source.retryMessageId),
    startedBy: nullable(readSender)(source.startedBy),
    sourceSessionId: nullable(text)(source.sourceSessionId),
    loginAvailable: flag(source.loginAvailable),
    loginShared: flag(source.loginShared),
    // A session that continues an old session from Conductor names it. A
    // native session has no such field.
    ...(source.conductorImport === undefined
      ? {}
      : { conductorImport: readImportSession(source.conductorImport) }),
  }
}

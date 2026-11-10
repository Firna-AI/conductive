import type { AgentChoice } from '../../src/shared/agents'
import type { CommitAuthor } from '../../src/shared/commit-author'
import type { Attachment, UserMessage } from '../../src/shared/messages'
import type {
  RunnerTurnCredential,
  WorkspaceToRunnerV2 as WorkspaceToRunner,
} from '../../src/shared/runner'
import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import { array, integer, nullable, object, oneOf, string } from './parse'
import { parseBranches } from './instruction-state'

export function parseChoice(value: unknown): AgentChoice {
  const input = object(value)
  return {
    agent: oneOf(input.agent, ['claude', 'codex']),
    model: string(input.model),
    effort: oneOf(input.effort, [
      'none',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]),
  }
}

function parseCredential(value: unknown): RunnerTurnCredential {
  const input = object(value)
  const token = string(input.token)
  if (input.agent === 'claude') {
    return {
      agent: 'claude',
      kind: oneOf(input.kind, ['token', 'api-key']),
      token,
    }
  }
  if (input.agent === 'codex' && input.kind === 'api-key') {
    return { agent: 'codex', kind: 'api-key', token }
  }
  throw new Error('The turn credential type is not supported.')
}

function parseAttachment(value: unknown): Attachment {
  const input = object(value)
  return {
    id: string(input.id),
    name: string(input.name),
    kind: oneOf(input.kind, ['file', 'image']),
    mediaType: string(input.mediaType),
    sizeBytes: integer(input.sizeBytes),
  }
}

function parseUserMessage(value: unknown): UserMessage {
  const input = object(value)
  const sender = object(input.sender)
  return {
    id: string(input.id),
    sessionId: string(input.sessionId),
    sender: {
      id: string(sender.id),
      githubLogin: string(sender.githubLogin),
      displayName: nullable(sender.displayName),
      avatarUrl: nullable(sender.avatarUrl),
    },
    text: string(input.text),
    attachments: array(input.attachments, parseAttachment),
    choice: parseChoice(input.choice),
    createdAt: integer(input.createdAt),
    state: oneOf(input.state, ['queued', 'sent']),
  }
}

function parseCommitAuthor(
  value: unknown,
  warn: (message: string) => void,
): CommitAuthor | null {
  if (value === undefined || value === null) return null
  try {
    const author = object(value)
    return { name: string(author.name), email: string(author.email) }
  } catch {
    warn('The turn commit author is invalid. The sandbox author will be used.')
    return null
  }
}

export function parseWorkspaceMessage(
  value: unknown,
  warn: (message: string) => void,
): WorkspaceToRunner {
  const input = object(value)
  const type = string(input.type)
  if (type === 'welcome') {
    if (input.protocolVersion !== RUNNER_PROTOCOL_VERSION) {
      throw new Error('The runner protocol version is not supported.')
    }
    return {
      type,
      protocolVersion: RUNNER_PROTOCOL_VERSION,
      streamId: string(input.streamId),
      confirmedThrough: integer(input.confirmedThrough),
    }
  }
  if (type === 'confirm') {
    return {
      type,
      streamId: string(input.streamId),
      throughEventNumber: integer(input.throughEventNumber),
    }
  }
  if (type === 'resend') {
    return {
      type,
      streamId: string(input.streamId),
      fromEventNumber: integer(input.fromEventNumber),
    }
  }
  if (type === 'file.read') {
    return {
      type,
      requestId: string(input.requestId),
      path: string(input.path),
      maxBytes: integer(input.maxBytes),
    }
  }
  if (type === 'file.diff') {
    return {
      type,
      requestId: string(input.requestId),
      path: string(input.path),
      defaultBranch: string(input.defaultBranch),
    }
  }
  const commandId = string(input.commandId)
  if (type === 'report.refresh') {
    return {
      type,
      commandId,
      kind: oneOf(input.kind, [
        'files.snapshot',
        'changes.updated',
        'start.updated',
        'workspace.title',
      ]),
    }
  }
  const sessionId = string(input.sessionId)
  if (type === 'model') {
    return { type, commandId, sessionId, choice: parseChoice(input.choice) }
  }
  const turnId = string(input.turnId)
  if (type === 'interrupt') return { type, commandId, sessionId, turnId }
  if (type === 'turn' || type === 'message') {
    const message = parseUserMessage(input.message)
    if (message.sessionId !== sessionId)
      throw new Error('The message does not match its session.')
    const attachments = array(input.attachments, (value) => {
      const attachment = object(value)
      return {
        attachmentId: string(attachment.attachmentId),
        path: string(attachment.path),
      }
    })
    const command = {
      commandId,
      sessionId,
      turnId,
      message,
      attachments,
      ...(input.branches === undefined
        ? {}
        : { branches: parseBranches(input.branches) }),
    }
    if (type === 'message') return { ...command, type }
    const credential = parseCredential(input.credential)
    if (message.choice.agent !== credential.agent)
      throw new Error('The message does not match its turn credential.')
    return {
      ...command,
      type,
      credential,
      commitAuthor: parseCommitAuthor(input.commitAuthor, warn),
    }
  }
  throw new Error('The runner command is not supported.')
}

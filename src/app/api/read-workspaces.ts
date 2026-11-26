import type { Workspace } from '../../shared/generated/Workspace'
import type { Attachment } from '../../shared/generated/Attachment'
import type { UserMessage } from '../../shared/generated/UserMessage'
import type { StartStep } from '../../shared/generated/StartStep'
import type { WorkspaceStart } from '../../shared/generated/WorkspaceStart'
import { createWorkspaceReader } from '../../shared/workspace-read'
import { readWorkspaceListRepositories } from '../../shared/merge-queue-read'
import type {
  CreateWorkspaceResponse,
  OrderedWorkspaceResponse,
  RestartWorkspaceResponse,
  WorkspaceResponse,
  WorkspacesResponse,
} from '../../shared/workspaces'
import {
  choice,
  count,
  items,
  maybeCount,
  maybeNested,
  maybeText,
  nested,
  ParseError,
  record,
  text,
} from './parse'
import { readChoice, readSender } from './read-core'
import { readWorkspaceSeed } from './read-workspace-seed'

export const readWorkspace = createWorkspaceReader({
  record,
  text,
  count,
  nullableText: maybeText,
  nullableCount: maybeCount,
  sender: readSender,
  choice: readChoice,
  invalidState: (states) =>
    new ParseError(`state is not one of ${states.join(', ')}.`),
})

function readStep(value: unknown): StartStep {
  const step = record(value, 'step')
  return {
    id: text(step, 'id'),
    label: text(step, 'label'),
    state: choice(step, 'state', ['running', 'completed', 'failed']),
    startedAt: count(step, 'startedAt'),
    completedAt: maybeCount(step, 'completedAt'),
  }
}

export function readStart(value: unknown): WorkspaceStart {
  const start = record(value, 'start')
  return {
    kind: choice(start, 'kind', ['create', 'resume']),
    startedAt: count(start, 'startedAt'),
    steps: items(start, 'steps', readStep),
  }
}

export function readWorkspaceResponse(value: unknown): WorkspaceResponse {
  const body = record(value, 'workspace response')
  return {
    workspace: nested(body, 'workspace', readWorkspace),
    start: maybeNested(body, 'start', readStart),
    error: maybeNested(body, 'error', (item) => {
      const error = record(item, 'error')
      return {
        code: text(error, 'code'),
        message: text(error, 'message'),
        log: maybeText(error, 'log'),
      }
    }),
  }
}

/**
 * A read of the workspace or a Resume reply, with the workspace event number
 * whose state it holds. A create, an Archive, and the other writes carry no
 * number, so they read with `readWorkspaceResponse`.
 */
export function readOrderedWorkspaceResponse(
  value: unknown,
): OrderedWorkspaceResponse {
  const body = record(value, 'workspace response')
  const detail = readWorkspaceResponse(body)
  const eventNumber = count(body, 'eventNumber')
  const seed = readWorkspaceSeed(body.seed, eventNumber)
  return {
    ...detail,
    eventNumber,
    ...(seed === undefined ? {} : { seed }),
  }
}

export function readAttachment(value: unknown): Attachment {
  const attachment = record(value, 'attachment')
  return {
    id: text(attachment, 'id'),
    name: text(attachment, 'name'),
    path: maybeText(attachment, 'path'),
    kind: choice(attachment, 'kind', ['image', 'file']),
    mediaType: text(attachment, 'mediaType'),
    sizeBytes: count(attachment, 'sizeBytes'),
  }
}

function readUserMessage(value: unknown): UserMessage {
  const message = record(value, 'message')
  return {
    id: text(message, 'id'),
    sessionId: text(message, 'sessionId'),
    sender: nested(message, 'sender', readSender),
    text: text(message, 'text'),
    attachments: items(message, 'attachments', readAttachment),
    choice: nested(message, 'choice', readChoice),
    createdAt: count(message, 'createdAt'),
    state: choice(message, 'state', ['queued', 'sent']),
  }
}

export function readCreated(value: unknown): CreateWorkspaceResponse {
  const body = record(value, 'created workspace')
  return {
    ...readWorkspaceResponse(value),
    sessionId: text(body, 'sessionId'),
    firstMessage: nested(body, 'firstMessage', readUserMessage),
  }
}

export function readWorkspaces(value: unknown): Workspace[] {
  return items(record(value, 'workspaces'), 'workspaces', readWorkspace)
}

export function readWorkspaceList(value: unknown): WorkspacesResponse {
  const body = record(value, 'workspaces')
  const repositories = readWorkspaceListRepositories(body.repositories)
  return {
    workspaces: items(body, 'workspaces', readWorkspace),
    ...(repositories !== undefined && { repositories }),
  }
}

/** The reply of Restart: whether the newest software came before it. */
export function readRestartWorkspaceResponse(
  value: unknown,
): RestartWorkspaceResponse {
  const body = record(value, 'restart reply')
  return { updateCheck: choice(body, 'updateCheck', ['ok', 'failed']) }
}

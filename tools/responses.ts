import type {
  AgentCreateWorkspaceResponse,
  AgentListWorkspacesResponse,
} from '../src/shared/agent-tools.ts'
import type { MessageSender } from '../src/shared/messages.ts'
import type { Workspace, WorkspaceState } from '../src/shared/workspaces.ts'
import { choice, record, text, ToolInputError } from './input.ts'

export function workspaceState(value: unknown): WorkspaceState {
  switch (value) {
    case 'working':
    case 'input':
    case 'unread':
    case 'ready':
    case 'starting':
    case 'stopped':
    case 'error':
    case 'archived':
      return value
    default:
      throw new ToolInputError('The workspace state is not valid.')
  }
}

function nullableText(value: unknown): string | null {
  if (value === null) return null
  if (typeof value === 'string') return value
  throw new ToolInputError('The workspace reply is not valid.')
}

function timestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new ToolInputError('The workspace reply is not valid.')
}

export function messageSender(value: unknown): MessageSender {
  const fields = record(value)
  return {
    id: text(fields.id),
    githubLogin: text(fields.githubLogin),
    displayName: nullableText(fields.displayName),
    avatarUrl: nullableText(fields.avatarUrl),
  }
}

function workspace(value: unknown): Workspace {
  const fields = record(value)
  return {
    id: text(fields.id),
    orgId: text(fields.orgId),
    repositoryId: text(fields.repositoryId),
    sectionId: text(fields.sectionId),
    owner: messageSender(fields.owner),
    name: nullableText(fields.name),
    branch: text(fields.branch),
    choice: choice(fields.choice),
    state: workspaceState(fields.state),
    createdAt: timestamp(fields.createdAt),
    updatedAt: timestamp(fields.updatedAt),
    archivedAt:
      fields.archivedAt === null ? null : timestamp(fields.archivedAt),
  }
}

export function createdWorkspace(value: unknown): AgentCreateWorkspaceResponse {
  const fields = record(value)
  return {
    workspace: workspace(fields.workspace),
    sessionId: text(fields.sessionId),
  }
}

export function listedWorkspaces(value: unknown): AgentListWorkspacesResponse {
  const fields = record(value)
  if (!Array.isArray(fields.workspaces)) {
    throw new ToolInputError('The workspace list is not valid.')
  }
  return {
    workspaces: fields.workspaces.map((value: unknown) => {
      const item = record(value)
      return {
        id: text(item.id),
        name: nullableText(item.name),
        branch: text(item.branch),
        state: workspaceState(item.state),
      }
    }),
  }
}

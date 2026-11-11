import type {
  AgentWorkspaceSummary,
  AgentListModelsResponse,
  AgentListRepositoriesResponse,
  AgentListSectionsResponse,
} from '../src/shared/agent-tools.ts'
import type {
  AgentCreateWorkspaceResponse,
  AgentListWorkspacesResponse,
  AgentWorkspaceResponse,
  AgentWorkspaceListEntry,
} from '../src/shared/agent-workspaces.ts'
import type { MessageSender } from '../src/shared/messages.ts'
import type { Workspace, WorkspaceState } from '../src/shared/workspaces.ts'
import { agent, choice, effort, record, text, ToolInputError } from './input.ts'

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

export function nullableText(value: unknown): string | null {
  if (value === null) return null
  if (typeof value === 'string') return value
  throw new ToolInputError('The workspace reply is not valid.')
}

export function timestamp(value: unknown): number {
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
    number: timestamp(fields.number),
    link: text(fields.link),
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
    restoreUntil:
      fields.restoreUntil === null ? null : timestamp(fields.restoreUntil),
  }
}

export function createdWorkspace(value: unknown): AgentCreateWorkspaceResponse {
  const fields = record(value)
  return {
    workspace: workspace(fields.workspace),
    sessionId: text(fields.sessionId),
    sessionLink: text(fields.sessionLink),
  }
}

export function listedWorkspaces(value: unknown): AgentListWorkspacesResponse {
  const fields = record(value)
  if (!Array.isArray(fields.workspaces)) {
    throw new ToolInputError('The workspace list is not valid.')
  }
  return {
    ...(fields.hasMore !== undefined && { hasMore: flag(fields.hasMore) }),
    workspaces: fields.workspaces.map(workspaceEntry),
  }
}

export function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  throw new ToolInputError('The workspace reply is not valid.')
}

export function flag(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  throw new ToolInputError('The workspace reply is not valid.')
}

export function listedRepositories(
  value: unknown,
): AgentListRepositoriesResponse {
  return {
    repositories: array(record(value).repositories).map((value) => {
      const fields = record(value)
      return {
        id: text(fields.id),
        fullName: text(fields.fullName),
        defaultBranch: text(fields.defaultBranch),
        current: flag(fields.current),
      }
    }),
  }
}

export function listedSections(value: unknown): AgentListSectionsResponse {
  return {
    sections: array(record(value).sections).map((value) => {
      const fields = record(value)
      return {
        id: text(fields.id),
        name: text(fields.name),
        default: flag(fields.default),
      }
    }),
  }
}

export function listedModels(value: unknown): AgentListModelsResponse {
  const fields = record(value)
  return {
    models: array(fields.models).map((value) => {
      const fields = record(value)
      return {
        agent: agent(fields.agent),
        model: text(fields.model),
        label: text(fields.label),
        efforts: array(fields.efforts).map(effort),
      }
    }),
    defaultChoice:
      fields.defaultChoice === null ? null : choice(fields.defaultChoice),
  }
}

export function workspaceSummary(value: unknown): AgentWorkspaceSummary {
  const fields = record(value)
  return {
    id: text(fields.id),
    number: timestamp(fields.number),
    link: text(fields.link),
    name: nullableText(fields.name),
    branch: text(fields.branch),
    state: workspaceState(fields.state),
  }
}

function workspaceEntry(value: unknown): AgentWorkspaceListEntry {
  const fields = record(value)
  const owner = record(fields.owner)
  return {
    ...workspaceSummary(fields),
    owner: {
      id: text(owner.id),
      githubLogin: text(owner.githubLogin),
      displayName: nullableText(owner.displayName),
    },
  }
}

export function workspaceDetail(value: unknown): AgentWorkspaceResponse {
  const fields = record(record(value).workspace)
  const repository = record(fields.repository)
  const section = record(fields.section)
  return {
    workspace: {
      ...workspaceEntry(fields),
      repository: {
        id: text(repository.id),
        fullName: text(repository.fullName),
        defaultBranch: text(repository.defaultBranch),
      },
      baseBranch: text(fields.baseBranch),
      section: { id: text(section.id), name: text(section.name) },
      createdAt: timestamp(fields.createdAt),
      lastActivityAt: timestamp(fields.lastActivityAt),
      archivedAt:
        fields.archivedAt === null ? null : timestamp(fields.archivedAt),
      restoreUntil:
        fields.restoreUntil === null ? null : timestamp(fields.restoreUntil),
    },
  }
}

export function replyCounter(value: unknown): number {
  const result = timestamp(value)
  if (Number.isSafeInteger(result) && result >= 0) return result
  throw new ToolInputError('The workspace reply is not valid.')
}

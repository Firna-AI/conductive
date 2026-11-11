import type {
  AgentCreateWorkspaceResponse,
  AgentListModelsResponse,
  AgentListRepositoriesResponse,
  AgentListSectionsResponse,
  AgentListWorkspacesResponse,
} from '../src/shared/agent-tools.ts'
import type { MessageSender } from '../src/shared/messages.ts'
import { readGitHubSummary } from '../src/shared/github-read.ts'
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
    github: readGitHubSummary(fields.github),
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
    workspaces: fields.workspaces.map((value: unknown) => {
      const item = record(value)
      return {
        id: text(item.id),
        number: timestamp(item.number),
        link: text(item.link),
        name: nullableText(item.name),
        branch: text(item.branch),
        state: workspaceState(item.state),
      }
    }),
  }
}

function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  throw new ToolInputError('The workspace reply is not valid.')
}

function flag(value: unknown): boolean {
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

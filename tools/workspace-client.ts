import { MACHINE_PATHS } from '../src/shared/agent-tools.ts'
import {
  agentWorkspacePath,
  agentWorkspacePaths,
  type AgentCreateWorkspaceRequest,
  type AgentListWorkspacesRequest,
  type AgentRenameWorkspaceRequest,
  type AgentMoveWorkspaceRequest,
} from '../src/shared/agent-workspaces.ts'
import { createWorkspaceInput, sessionWorkspace, text } from './input.ts'
import { listWorkspacesInput } from './list-input.ts'
import { toolQuery } from './query.ts'
import {
  createdWorkspace,
  listedModels,
  listedRepositories,
  listedSections,
  listedWorkspaces,
  workspaceDetail,
} from './responses.ts'
import type { ToolReplyReader } from './transport.ts'

export function createWorkspaceClient(read: ToolReplyReader) {
  return {
    create(input: AgentCreateWorkspaceRequest) {
      const parsed = createWorkspaceInput(input)
      return read(MACHINE_PATHS.workspaces, createdWorkspace, {
        ...parsed,
        requestId: parsed.requestId ?? crypto.randomUUID(),
      })
    },
    list(input: AgentListWorkspacesRequest = {}) {
      return read(
        toolQuery(MACHINE_PATHS.workspaces, listWorkspacesInput(input)),
        listedWorkspaces,
      )
    },
    getWorkspace(workspaceId?: string) {
      return read(
        agentWorkspacePath(sessionWorkspace(workspaceId)),
        workspaceDetail,
      )
    },
    renameWorkspace(input: AgentRenameWorkspaceRequest, workspaceId?: string) {
      return read(
        agentWorkspacePaths.rename(sessionWorkspace(workspaceId)),
        workspaceDetail,
        { name: text(input.name) },
      )
    },
    moveWorkspace(input: AgentMoveWorkspaceRequest, workspaceId?: string) {
      return read(
        agentWorkspacePaths.move(sessionWorkspace(workspaceId)),
        workspaceDetail,
        { sectionId: text(input.sectionId) },
      )
    },
    archiveWorkspace(workspaceId?: string) {
      return read(
        agentWorkspacePaths.archive(sessionWorkspace(workspaceId)),
        workspaceDetail,
        {},
      )
    },
    listRepositories: () =>
      read(MACHINE_PATHS.repositories, listedRepositories),
    listSections: () => read(MACHINE_PATHS.sections, listedSections),
    listModels: () => read(MACHINE_PATHS.models, listedModels),
  }
}

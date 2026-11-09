import {
  MACHINE_PATHS,
  type AgentCreateWorkspaceRequest,
  type AgentCreateWorkspaceResponse,
  type AgentListModelsResponse,
  type AgentListRepositoriesResponse,
  type AgentListSectionsResponse,
  type AgentListWorkspacesResponse,
} from '../src/shared/agent-tools.ts'
import { TOOL_TURN_HEADER } from './context.ts'
import { createWorkspaceInput } from './input.ts'
import {
  createdWorkspace,
  listedModels,
  listedRepositories,
  listedSections,
  listedWorkspaces,
} from './responses.ts'
import {
  createMacCommandClient,
  type MacCommandOptions,
} from './device-client.ts'
import type { DeviceCommandResponse } from '../src/shared/device.ts'

export interface WorkspaceToolClient {
  create(
    input: AgentCreateWorkspaceRequest,
  ): Promise<AgentCreateWorkspaceResponse>
  list(): Promise<AgentListWorkspacesResponse>
  listRepositories(): Promise<AgentListRepositoriesResponse>
  listSections(): Promise<AgentListSectionsResponse>
  listModels(): Promise<AgentListModelsResponse>
  runMacCommand(input: MacCommandOptions): Promise<DeviceCommandResponse>
}

export interface WorkspaceToolConfiguration {
  machineOrigin: string
  workspaceToken: string
  turnId?: string
}

export class WorkspaceToolError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.status = status
  }
}

export function createWorkspaceToolClient(
  configuration: WorkspaceToolConfiguration,
  send: (request: Request) => Promise<Response> = fetch,
): WorkspaceToolClient {
  const request = async (
    path: string,
    input?: AgentCreateWorkspaceRequest,
  ): Promise<unknown> => {
    let response: Response
    try {
      const headers = new Headers({
        Authorization: `Bearer ${configuration.workspaceToken}`,
      })
      if (configuration.turnId) {
        headers.set(TOOL_TURN_HEADER, configuration.turnId)
      }
      if (input) headers.set('Content-Type', 'application/json')
      response = await send(
        new Request(new URL(path, configuration.machineOrigin), {
          method: input ? 'POST' : 'GET',
          headers,
          ...(input && { body: JSON.stringify(input) }),
          redirect: 'error',
        }),
      )
    } catch {
      throw new WorkspaceToolError('The workspace request failed. Try again.')
    }
    if (!response.ok) {
      throw new WorkspaceToolError(
        response.status === 401
          ? 'The workspace login is not valid. Start the workspace again.'
          : 'The workspace request failed. Check its fields and try again.',
        response.status,
      )
    }
    try {
      return await response.json()
    } catch {
      throw new WorkspaceToolError(
        'The workspace reply is not valid. Try again.',
      )
    }
  }
  const read = async <T>(
    path: string,
    parse: (value: unknown) => T,
    input?: AgentCreateWorkspaceRequest,
  ): Promise<T> => {
    const value = await request(path, input)
    try {
      return parse(value)
    } catch {
      throw new WorkspaceToolError(
        'The workspace reply is not valid. Try again.',
      )
    }
  }
  return {
    runMacCommand: createMacCommandClient(configuration, send),
    async create(input) {
      return read(
        MACHINE_PATHS.workspaces,
        createdWorkspace,
        createWorkspaceInput(input),
      )
    },
    list: () => read(MACHINE_PATHS.workspaces, listedWorkspaces),
    listRepositories: () =>
      read(MACHINE_PATHS.repositories, listedRepositories),
    listSections: () => read(MACHINE_PATHS.sections, listedSections),
    listModels: () => read(MACHINE_PATHS.models, listedModels),
  }
}

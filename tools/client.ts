import {
  MACHINE_PATHS,
  type AgentCreateWorkspaceRequest,
  type AgentCreateWorkspaceResponse,
  type AgentListWorkspacesResponse,
} from '../src/shared/agent-tools.ts'
import { TOOL_TURN_HEADER } from './context.ts'
import { createWorkspaceInput } from './input.ts'
import { createdWorkspace, listedWorkspaces } from './responses.ts'
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
  const endpoint = new URL(
    MACHINE_PATHS.workspaces,
    configuration.machineOrigin,
  )
  const request = async (
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
        new Request(endpoint, {
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
  return {
    runMacCommand: createMacCommandClient(configuration, send),
    async create(input) {
      const value = await request(createWorkspaceInput(input))
      try {
        return createdWorkspace(value)
      } catch {
        throw new WorkspaceToolError(
          'The workspace reply is not valid. Try again.',
        )
      }
    },
    async list() {
      const value = await request()
      try {
        return listedWorkspaces(value)
      } catch {
        throw new WorkspaceToolError(
          'The workspace reply is not valid. Try again.',
        )
      }
    },
  }
}

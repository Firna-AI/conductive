import {
  MACHINE_PATHS,
  agentSessionsPath,
  agentSessionTranscriptPath,
  agentSessionMessagesPath,
  type AgentCreateSessionRequest,
  type AgentCreateSessionResponse,
  type AgentSendMessageRequest,
  type AgentSendMessageResponse,
  type AgentReadSessionRequest,
  type AgentReadSessionResponse,
  type AgentListSessionsResponse,
  type AgentListModelsResponse,
  type AgentListRepositoriesResponse,
  type AgentListSectionsResponse,
} from '../src/shared/agent-tools.ts'
import type {
  AgentCreateWorkspaceRequest,
  AgentCreateWorkspaceResponse,
  AgentListWorkspacesResponse,
} from '../src/shared/agent-workspaces.ts'
import { TOOL_TURN_HEADER } from './context.ts'
import {
  createWorkspaceInput,
  createSessionInput,
  sendSessionInput,
  readSessionInput,
  sessionWorkspace,
  isRecord,
  text,
} from './input.ts'
import {
  createdWorkspace,
  listedModels,
  listedRepositories,
  listedSections,
  listedWorkspaces,
} from './responses.ts'
import {
  listedSessions,
  readSession,
  createdSession,
  sentMessage,
} from './session-responses.ts'
import {
  createMacCommandClient,
  type MacCommandOptions,
} from './device-client.ts'
import {
  DEVICE_COMMAND_PATH,
  type DeviceCommandResponse,
} from '../src/shared/device.ts'

export interface WorkspaceToolClient {
  create(
    input: AgentCreateWorkspaceRequest,
  ): Promise<AgentCreateWorkspaceResponse>
  list(): Promise<AgentListWorkspacesResponse>
  listRepositories(): Promise<AgentListRepositoriesResponse>
  listSections(): Promise<AgentListSectionsResponse>
  listModels(): Promise<AgentListModelsResponse>
  listSessions(workspaceId?: string): Promise<AgentListSessionsResponse>
  readSession(
    sessionId: string,
    input?: AgentReadSessionRequest,
    workspaceId?: string,
  ): Promise<AgentReadSessionResponse>
  createSession(
    input?: AgentCreateSessionRequest,
    workspaceId?: string,
  ): Promise<AgentCreateSessionResponse>
  sendMessage(
    sessionId: string,
    input: AgentSendMessageRequest,
    workspaceId?: string,
  ): Promise<AgentSendMessageResponse>
  runMacCommand(input: MacCommandOptions): Promise<DeviceCommandResponse>
}

export type ToolReplyReader = <T>(
  path: string,
  parse: (value: unknown) => T,
  input?: object,
) => Promise<T>

export interface WorkspaceToolConfiguration {
  machineOrigin: string
  workspaceToken: string
  turnId?: string
}

export class WorkspaceToolError extends Error {
  readonly status: number | null
  readonly code: string | null

  constructor(
    message: string,
    status: number | null = null,
    code: string | null = null,
  ) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function createWorkspaceToolClient(
  configuration: WorkspaceToolConfiguration,
  send: (request: Request) => Promise<Response> = fetch,
): WorkspaceToolClient {
  const request = async (path: string, input?: object): Promise<unknown> => {
    const mac = path.startsWith(DEVICE_COMMAND_PATH)
    const subject = mac ? 'Mac' : 'workspace'
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
      throw new WorkspaceToolError(`The ${subject} request failed. Try again.`)
    }
    if (!response.ok) {
      const failure: unknown = await response.json().catch(() => null)
      if (
        isRecord(failure) &&
        isRecord(failure.error) &&
        typeof failure.error.code === 'string' &&
        failure.error.code &&
        typeof failure.error.message === 'string'
      ) {
        const redact = (value: string) =>
          value.replaceAll(configuration.workspaceToken, '[redacted]')
        const guidance =
          mac &&
          response.status === 403 &&
          failure.error.code === 'calling_turn_required'
            ? ' The agent turn ended. The tool cannot read the Mac command result.'
            : ''
        throw new WorkspaceToolError(
          redact(failure.error.message) + guidance,
          response.status,
          redact(failure.error.code),
        )
      }
      throw new WorkspaceToolError(
        response.status === 401
          ? 'The workspace login is not valid. Start the workspace again.'
          : `The ${subject} request failed. Check its fields and try again.`,
        response.status,
      )
    }
    try {
      return await response.json()
    } catch {
      throw new WorkspaceToolError(
        `The ${subject} reply is not valid. Try again.`,
      )
    }
  }
  const read = async <T>(
    path: string,
    parse: (value: unknown) => T,
    input?: object,
  ): Promise<T> => {
    const value = await request(path, input)
    try {
      return parse(value)
    } catch {
      throw new WorkspaceToolError(
        `The ${path.startsWith(DEVICE_COMMAND_PATH) ? 'Mac' : 'workspace'} reply is not valid. Try again.`,
      )
    }
  }
  return {
    runMacCommand: createMacCommandClient(configuration, read),
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
    listSessions: (workspaceId) =>
      read(agentSessionsPath(sessionWorkspace(workspaceId)), listedSessions),
    readSession(sessionId, input = {}, workspaceId) {
      const url = new URL(
        agentSessionTranscriptPath(
          sessionWorkspace(workspaceId),
          text(sessionId),
        ),
        configuration.machineOrigin,
      )
      const options = readSessionInput(input)
      for (const [key, value] of Object.entries(options))
        url.searchParams.set(key, String(value))
      return read(url.pathname + url.search, readSession)
    },
    createSession(input = {}, workspaceId) {
      const parsed = createSessionInput(input)
      return read(
        agentSessionsPath(sessionWorkspace(workspaceId)),
        createdSession,
        { ...parsed, requestId: parsed.requestId ?? crypto.randomUUID() },
      )
    },
    sendMessage(sessionId, input, workspaceId) {
      const parsed = sendSessionInput(input)
      return read(
        agentSessionMessagesPath(
          sessionWorkspace(workspaceId),
          text(sessionId),
        ),
        sentMessage,
        { ...parsed, requestId: parsed.requestId ?? crypto.randomUUID() },
      )
    },
  }
}

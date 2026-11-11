import type { Agent, AgentChoice, AgentModel, Effort } from './agents'
import type { Workspace, WorkspaceState } from './workspaces'
import type { MessageSender, UserMessage } from './messages'
import type { Session, TranscriptDetail } from './sessions'

/** Machine routes use workspace or turn tokens, or a GitHub webhook signature. */
export const MACHINE_PATHS = {
  runner: '/v1/runner',
  githubWebhook: '/v1/github/webhooks',
  gitCredential: '/v1/git/credential',
  workspaces: '/v1/tools/workspaces',
  claudeGateway: '/v1/model/claude',
  codexGateway: '/v1/model/codex',
  repositories: '/v1/tools/repositories',
  sections: '/v1/tools/sections',
  models: '/v1/tools/models',
} as const

/** Register this local server. Runtime environment supplies its turn and token. */
export const WORKSPACE_TOOLS_MCP = {
  command: '/usr/local/bin/conductive',
  args: ['mcp'],
} as const

export interface AgentCreateWorkspaceRequest {
  repositoryId: string
  firstMessage: string
  model?: { agent: Agent; model: string }
  effort?: Effort
  sectionId?: string
  name?: string
}
export interface AgentCreateWorkspaceResponse {
  workspace: Workspace
  sessionId: string
  sessionLink: string
}
export interface AgentWorkspaceSummary {
  id: string
  number: number
  link: string
  name: Workspace['name']
  branch: string
  state: WorkspaceState
}
export interface AgentListWorkspacesResponse {
  workspaces: readonly AgentWorkspaceSummary[]
}
export interface AgentListRepositoriesResponse {
  repositories: readonly {
    id: string
    fullName: string
    defaultBranch: string
    current: boolean
  }[]
}
export interface AgentListSectionsResponse {
  sections: readonly { id: string; name: string; default: boolean }[]
}
export interface AgentListModelsResponse {
  models: readonly AgentModel[]
  defaultChoice: AgentChoice | null
}

/** An omitted workspace is resolved from the token by the machine handler. */
export function agentSessionsPath(workspaceId = 'current'): string {
  return `${MACHINE_PATHS.workspaces}/${encodeURIComponent(workspaceId)}/sessions`
}

export function agentSessionTranscriptPath(
  workspaceId: string | undefined,
  sessionId: string,
): string {
  return `${agentSessionsPath(workspaceId)}/${encodeURIComponent(sessionId)}/transcript`
}

export function agentSessionMessagesPath(
  workspaceId: string | undefined,
  sessionId: string,
): string {
  return `${agentSessionsPath(workspaceId)}/${encodeURIComponent(sessionId)}/messages`
}

interface AgentSessionChoiceRequest {
  model?: { agent: Agent; model: string }
  effort?: Effort
  requestId?: string
}

export interface AgentCreateSessionRequest extends AgentSessionChoiceRequest {
  title?: string
  firstMessage?: string
}

export interface AgentSendMessageRequest extends AgentSessionChoiceRequest {
  text: string
}

interface AgentSessionAcceptance {
  session: Session
  eventNumber: number
}

export type AgentSessionAccepted = AgentSessionAcceptance &
  ({ message: null; turnId: null } | { message: UserMessage; turnId: string })

export type AgentSessionResume =
  | { state: 'not_needed' | 'queued' | 'waiting'; error: null }
  | { state: 'failed'; error: { code: string; message: string } }

export type AgentSessionWriteResponse = AgentSessionAccepted & {
  workspace: AgentWorkspaceSummary
  session: Session & { link: string }
  resume: AgentSessionResume
}

export type AgentCreateSessionResponse = AgentSessionWriteResponse
export type AgentSendMessageResponse = Extract<
  AgentSessionWriteResponse,
  { message: UserMessage }
>

export interface AgentSessionSummary {
  id: string
  link: string
  title: string | null
  choice: AgentChoice
  startedBy: MessageSender | null
  state: 'running' | 'failed' | 'idle'
  closed: boolean
}

export interface AgentListSessionsResponse {
  workspace: AgentWorkspaceSummary
  sessions: readonly AgentSessionSummary[]
}

/** Offsets count UTF-16 code units within the named one-based line. */
export interface AgentTranscriptPosition {
  line: number
  offset: number
}

export interface AgentReadSessionRequest {
  detail?: TranscriptDetail
  startLine?: number
  startOffset?: number
}

export interface AgentTranscriptWindow {
  markdown: string
  startLine: number
  endLine: number
  totalLines: number
  startOffset: number
  endOffset: number
  next: AgentTranscriptPosition | null
}

export interface AgentReadSessionResponse extends AgentTranscriptWindow {
  workspace: AgentWorkspaceSummary
  session: { id: string; link: string }
  detail: TranscriptDetail
}

/** The serialized reply leaves room below the published tool-result guidance. */
export const AGENT_TRANSCRIPT_MAX_BYTES = 32_000

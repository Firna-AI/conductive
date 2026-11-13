import type { AgentWorkspaceSummary } from '../../src/shared/agent-tools'
import type {
  AgentListSessionsResponse,
  AgentReadSessionRequest,
  AgentReadSessionResponse,
  AgentCreateSessionRequest,
  AgentSendMessageRequest,
  AgentSessionWriteResponse,
  AgentSessionResponse,
  AgentStopSessionResponse,
  AgentGetMessageResponse,
  AgentListSessionsRequest,
  AgentRenameSessionRequest,
  AgentCloseSessionRequest,
} from '../../src/shared/agent-sessions'
import type {
  AgentCreateWorkspaceResponse,
  AgentRenameWorkspaceRequest,
  AgentMoveWorkspaceRequest,
} from '../../src/shared/agent-workspaces'
import type { AgentChoice, AgentModel } from '../../src/shared/agents'
import type { MessageSender } from '../../src/shared/messages'
import type { User } from '../../src/shared/api'

import type {
  AgentCreateSectionRequest,
  AgentCreateSectionResponse,
  AgentDeleteSectionResponse,
} from '../../src/shared/agent-sections'
import type {
  AgentListPreviewsResponse,
  AgentOpenPreviewResponse,
  AgentClosePreviewResponse,
} from '../../src/shared/agent-previews'

export type ToolSectionWrite = { orgId: string; senderUserId: string } & (
  | ({ kind: 'create' } & AgentCreateSectionRequest)
  | { kind: 'delete'; sectionId: string }
)

export type ToolPreviewCall = { orgId: string; workspaceId: string } & (
  | { kind: 'list' }
  | { kind: 'open'; senderUserId: string; port: unknown }
  | { kind: 'close'; senderUserId: string; previewId: string }
)

export interface ToolWorkspaceCreation {
  orgId: string
  owner: MessageSender
  repositoryId: string
  startBranch?: string
  baseBranch?: string
  sectionId: string
  choice: AgentChoice
  firstMessage: string
  firstMessageId: string
  firstSessionTitle?: string
  name?: string
  sender: MessageSender
  createdByWorkspaceId: string
}

export interface ToolWorkspaceReplay {
  orgId: string
  senderUserId: string
  firstMessageId: string
  createdByWorkspaceId: string
}

export interface CallingTurn {
  workspaceId: string
  turnId: string
  senderUserId: string
  sessionId: string
}

export type ToolSessionWrite = {
  orgId: string
  workspaceId: string
  callerWorkspaceId: string
  callerSessionId: string
  senderUserId: string
  requestId: string
} & (
  | { kind: 'create'; input: AgentCreateSessionRequest }
  | { kind: 'send'; sessionId: string; input: AgentSendMessageRequest }
)

export type ToolSessionManagement = {
  orgId: string
  workspaceId: string
  sessionId: string
  callerWorkspaceId: string
  callerSessionId: string
  senderUserId: string
} & (
  | ({ kind: 'rename' } & AgentRenameSessionRequest)
  | ({ kind: 'close' } & Required<AgentCloseSessionRequest>)
  | { kind: 'stop' }
)

export type ToolWorkspaceWrite = {
  orgId: string
  workspaceId: string
  senderUserId: string
} & (
  | ({ kind: 'rename' } & AgentRenameWorkspaceRequest)
  | ({ kind: 'move' } & AgentMoveWorkspaceRequest)
  | { kind: 'archive' }
)

export interface ToolSessionAccess {
  user: User
  workspace: AgentWorkspaceSummary
}

/** The composition root supplies the lifecycle and the workspace's turn store. */
export interface AgentToolServices {
  writeSection(
    input: ToolSectionWrite,
  ): Promise<AgentCreateSectionResponse | AgentDeleteSectionResponse>
  previewCall(
    input: ToolPreviewCall,
  ): Promise<
    | AgentListPreviewsResponse
    | AgentOpenPreviewResponse
    | AgentClosePreviewResponse
  >
  replayWorkspaceCreation(
    input: ToolWorkspaceReplay,
  ): Promise<AgentCreateWorkspaceResponse | null>
  writeWorkspace(input: ToolWorkspaceWrite): Promise<void>
  models(): Promise<readonly AgentModel[]>
  manageSession(
    input: ToolSessionManagement,
  ): Promise<AgentSessionResponse | AgentStopSessionResponse>
  getSession(
    orgId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<AgentSessionResponse>
  getMessage(
    orgId: string,
    workspaceId: string,
    sessionId: string,
    messageId: string,
  ): Promise<AgentGetMessageResponse>
  writeSession(input: ToolSessionWrite): Promise<AgentSessionWriteResponse>
  listSessions(
    orgId: string,
    workspaceId: string,
    input?: AgentListSessionsRequest,
  ): Promise<AgentListSessionsResponse>
  readSession(
    orgId: string,
    workspaceId: string,
    sessionId: string,
    input: AgentReadSessionRequest,
  ): Promise<AgentReadSessionResponse>
  /** Return only an active turn belonging to this exact workspace and turn ID. */
  callingTurn(workspaceId: string, turnId: string): Promise<CallingTurn | null>
  /** Account policy supplies the default when no saved preference exists. */
  ownerDefaultChoice?(ownerUserId: string): Promise<AgentChoice | null>
  /**
   * Create through the normal lifecycle, using the latest good image. Keep the
   * first message durably and start it immediately as sender, not as owner.
   * Keep an accepted workspace and its first message when its sandbox cannot start.
   */
  createWorkspace(
    input: ToolWorkspaceCreation,
  ): Promise<AgentCreateWorkspaceResponse>
}

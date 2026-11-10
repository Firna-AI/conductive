import type {
  AgentCreateWorkspaceResponse,
  AgentListSessionsResponse,
  AgentReadSessionRequest,
  AgentReadSessionResponse,
} from '../../src/shared/agent-tools'
import type { AgentChoice, AgentModel } from '../../src/shared/agents'
import type { MessageSender } from '../../src/shared/messages'

export interface ToolWorkspaceCreation {
  orgId: string
  owner: MessageSender
  repositoryId: string
  sectionId: string
  choice: AgentChoice
  firstMessage: string
  name?: string
  sender: MessageSender
  createdByWorkspaceId: string
}

export interface CallingTurn {
  workspaceId: string
  turnId: string
  senderUserId: string
}

/** The composition root supplies the lifecycle and the workspace's turn store. */
export interface AgentToolServices {
  models(): Promise<readonly AgentModel[]>
  listSessions(
    orgId: string,
    workspaceId: string,
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

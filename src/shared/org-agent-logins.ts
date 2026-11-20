import type { DefaultAgentLogin } from './generated/DefaultAgentLogin'
import type {
  EndpointModelList,
  RefreshAgentLoginModelsResponse,
  SaveAgentLoginResponse,
} from './account'
import type { Agent } from './generated/Agent'
import type { Timestamp } from './generated/Timestamp'

export type SaveOrgAgentLoginRequest =
  | { agent: Agent; kind: 'api-key'; secret: string }
  | { agent: Agent; kind: 'endpoint'; endpoint: string; secret: string }

/** A member gets no secret, full address, or endpoint model list. */
export type OrgAgentLoginStatus =
  | { agent: Agent; connected: false }
  | {
      agent: Agent
      connected: true
      kind: 'api-key'
      useForEveryMember: boolean
      updatedAt: Timestamp
    }
  | {
      agent: Agent
      connected: true
      kind: 'endpoint'
      host: string
      useForEveryMember: boolean
      updatedAt: Timestamp
      /** Only an admin receives the last successful model list. */
      modelList?: EndpointModelList
    }

export interface OrgAgentLoginsResponse {
  agentLogins: readonly OrgAgentLoginStatus[]
  defaultLogins?: readonly DefaultAgentLogin[]
}

export type SaveOrgAgentLoginResponse = OrgAgentLoginStatus &
  Pick<SaveAgentLoginResponse, 'endpointV1Added' | 'modelListReadFailed'>

export interface UpdateOrgAgentLoginRequest {
  useForEveryMember: boolean
}

export type UpdateOrgAgentLoginResponse = OrgAgentLoginStatus
export type RefreshOrgAgentLoginModelsResponse = RefreshAgentLoginModelsResponse

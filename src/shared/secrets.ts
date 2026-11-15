import { orgPath, type Timestamp } from './api'
import type { MessageSender } from './messages'
import { workspacePath } from './workspaces'

export function secretsPath(orgId: string): string {
  return `${orgPath(orgId)}/secrets`
}

export function secretPath(orgId: string, secretId: string): string {
  return `${secretsPath(orgId)}/${encodeURIComponent(secretId)}`
}

export function secretAllAgentsPath(orgId: string, secretId: string): string {
  return `${secretPath(orgId, secretId)}/all-agents`
}

export function workspaceCapabilitiesPath(orgId: string, id: string): string {
  return `${workspacePath(orgId, id)}/capabilities`
}

export interface OrgSecret {
  id: string
  name: string
  description: string
  createdByUserId: string
  createdBy: MessageSender | null
  allAgents: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SecretsResponse {
  secrets: readonly OrgSecret[]
}

export interface SecretResponse {
  secret: OrgSecret
}

export interface CreateSecretRequest {
  name: string
  description: string
  value: string
  allAgents?: boolean
}

export interface ReplaceSecretRequest {
  description?: string
  value?: string
}

export interface SetSecretAllAgentsRequest {
  allAgents: boolean
}

export interface WorkspaceCapabilities {
  preapprovedSecretIds: readonly string[]
  macAccess: boolean
}

export interface SessionSecretApproval {
  secretId: string
  sessionId: string
  approvedByUserId: string
  approvedBy: MessageSender | null
  approvedAt: Timestamp
}

export interface WorkspaceCapabilitiesResponse {
  capabilities: WorkspaceCapabilities & {
    sessionApprovals: readonly SessionSecretApproval[]
  }
}

export interface UpdateWorkspaceCapabilitiesRequest {
  preapprovedSecretIds?: readonly string[]
  macAccess?: boolean
  removeSessionApprovals?: readonly {
    secretId: string
    sessionId: string
  }[]
}

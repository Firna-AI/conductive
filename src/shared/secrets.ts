import { orgPath } from './api'
import type { MessageSender } from './generated/MessageSender'
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

export function secretRevealPath(orgId: string, secretId: string): string {
  return `${secretPath(orgId, secretId)}/reveal`
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
  createdAt: number
  updatedAt: number
  lastReveal: SecretReveal | null
}

export interface SecretReveal {
  revealedByUserId: string
  revealedBy: MessageSender | null
  revealedAt: number
}

export interface RevealSecretResponse {
  value: string
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

/**
 * The capabilities of a new workspace without a choice, as
 * [Mac access](../../docs/protocol/secrets.md#mac-access) says. The draft
 * of New workspace, the Worker, and the dev fake all start from it.
 */
export const NEW_WORKSPACE_CAPABILITIES: WorkspaceCapabilities = {
  preapprovedSecretIds: [],
  macAccess: false,
}

export interface SessionSecretApproval {
  secretId: string
  sessionId: string
  approvedByUserId: string
  approvedBy: MessageSender | null
  approvedAt: number
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

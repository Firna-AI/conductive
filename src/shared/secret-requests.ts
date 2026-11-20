import type { MessageSender } from './generated/MessageSender'
import { workspacePath } from './workspaces'

export const SECRET_TOOL_PATHS = {
  list: '/v1/tools/secrets',
  run: '/v1/tools/secrets/run',
} as const

export function secretRequestsPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/secret-requests`
}

export function secretAnswerPath(
  orgId: string,
  workspaceId: string,
  id: string,
): string {
  return `${secretRequestsPath(orgId, workspaceId)}/${encodeURIComponent(id)}/answer`
}

export function workspaceSecretValuePath(
  orgId: string,
  workspaceId: string,
  id: string,
): string {
  return `${workspacePath(orgId, workspaceId)}/secret-values/${encodeURIComponent(id)}`
}

export type SecretGrant =
  'all-agents' | 'workspace' | 'session' | '15-minutes' | 'workspace-value'
export type SecretValueLifetime = '15-minutes' | 'workspace' | 'save'

interface ToolSecret {
  name: string
  description: string
  available: boolean
}

/** @public Machine list contract for the workspace tools. */
export interface ListSecretsResponse {
  secrets: readonly ToolSecret[]
}

export interface RunWithSecretsRequest {
  names: readonly string[]
  command: string
  reason?: string
}

export type RunWithSecretsResponse =
  | {
      status: 'allowed'
      values: Record<string, string>
      grants: readonly SecretRunGrant[]
    }
  | {
      status: 'pending' | 'denied' | 'not-answered'
      requestId: string
      message: string
    }

export interface SecretRunGrant {
  name: string
  grant: SecretGrant
}

export interface RequestedSecret {
  name: string
  secretId: string | null
  description: string
}

export type SecretRequestEnd =
  'archived' | 'org-suspended' | 'owner-suspended' | 'session-closed'
export type SecretNoticeFailure =
  'login-not-shared' | 'login-unavailable' | 'sender-unavailable'

export interface SecretRequest {
  id: string
  workspaceId: string
  sessionId: string
  turnId: string
  sender: MessageSender
  secrets: readonly RequestedSecret[]
  reason: string
  command: string
  state: 'waiting' | 'late' | 'allowed' | 'denied' | 'not-answered'
  late: boolean
  createdAt: number
  updatedAt: number
  answeredBy: MessageSender | null
  lifetime: SecretValueLifetime | null
  endedBy: SecretRequestEnd | null
  notice:
    | { state: 'sent'; turnId: string }
    | { state: 'not-sent'; reason: SecretNoticeFailure }
    | null
}

export type AnswerSecretRequest =
  | { kind: 'deny' }
  | { kind: 'allow' }
  | {
      kind: 'values'
      lifetime: SecretValueLifetime
      values: Record<string, string>
    }

export interface WorkspaceSecretValue {
  id: string
  name: string
  suppliedBy: MessageSender
  createdAt: number
}

export interface SecretRequestsResponse {
  requests: readonly SecretRequest[]
  workspaceValues: readonly WorkspaceSecretValue[]
}

export interface SecretRequestResponse {
  request: SecretRequest
}

export type SecretWorkspaceEvent =
  | {
      type: 'secrets.request.updated'
      sessionId: string
      request: SecretRequest
    }
  | {
      type: 'secrets.run'
      sessionId: string
      turnId: string
      id: string
      names: readonly string[]
      command: string
      reason: string
      grants: readonly SecretRunGrant[]
    }
  | {
      type: 'secrets.notice'
      sessionId: string
      turnId: string
      requestId: string
      text: string
    }

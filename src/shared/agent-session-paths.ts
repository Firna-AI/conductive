import { MACHINE_PATHS } from './agent-tools.ts'

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

export function agentSessionPath(
  workspaceId: string | undefined,
  sessionId: string,
): string {
  return `${agentSessionsPath(workspaceId)}/${encodeURIComponent(sessionId)}`
}

export const agentSessionPaths = {
  rename: (workspaceId: string | undefined, sessionId: string) =>
    `${agentSessionPath(workspaceId, sessionId)}/rename`,
  close: (workspaceId: string | undefined, sessionId: string) =>
    `${agentSessionPath(workspaceId, sessionId)}/close`,
  stop: (workspaceId: string | undefined, sessionId: string) =>
    `${agentSessionPath(workspaceId, sessionId)}/stop`,
}

export function agentMessagePath(
  workspaceId: string | undefined,
  sessionId: string,
  messageId: string,
): string {
  return `${agentSessionMessagesPath(workspaceId, sessionId)}/${encodeURIComponent(messageId)}`
}

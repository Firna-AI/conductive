import type { Agent } from '../../src/shared/agents'

type AgentLoginKind =
  | { agent: 'claude'; kind: 'token' | 'api-key' }
  | { agent: 'codex'; kind: 'token' | 'api-key' }

export function agentLoginKind(
  agent: Agent,
  kind: string,
): AgentLoginKind | null {
  if (kind === 'token' || kind === 'api-key') return { agent, kind }
  return null
}

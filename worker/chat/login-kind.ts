import type { Agent } from '../../src/shared/agents'

type AgentLoginKind =
  | { agent: 'claude'; kind: 'token' | 'api-key' }
  | { agent: 'codex'; kind: 'api-key' }
  | { agent: Agent; kind: 'endpoint' }

export function agentLoginKind(
  agent: Agent,
  kind: string,
): AgentLoginKind | null {
  if (kind === 'endpoint') return { agent, kind }
  if (agent === 'claude' && (kind === 'token' || kind === 'api-key'))
    return { agent, kind }
  if (agent === 'codex' && kind === 'api-key') return { agent, kind }
  return null
}

export function nativeAgentLoginKind(agent: Agent, kind: string) {
  const login = agentLoginKind(agent, kind)
  return login?.kind === 'endpoint' ? null : login
}

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { Agent } from '../../src/shared/agents'

export function gatewayPath(
  path: string,
): { agent: Agent; suffix: string } | null {
  for (const [agent, base] of [
    ['claude', MACHINE_PATHS.claudeGateway],
    ['codex', MACHINE_PATHS.codexGateway],
  ] as const) {
    if (path === base || path.startsWith(`${base}/`))
      return { agent, suffix: path.slice(base.length) }
  }
  return null
}

export function allowedModelRoute(agent: Agent, method: string, path: string) {
  return (
    method === 'POST' &&
    (agent === 'claude'
      ? path === '/v1/messages' || path === '/v1/messages/count_tokens'
      : path === '/responses')
  )
}

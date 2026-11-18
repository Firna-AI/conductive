import type { AgentLoginStatus } from '../../shared/account'

export function endpointLoginFixtures(
  updatedAt: number,
): readonly AgentLoginStatus[] {
  return (['claude', 'codex'] as const).map((agent) => ({
    agent,
    connected: true,
    kind: 'endpoint',
    host: 'proxy.example.test',
    noReuse: false,
    updatedAt,
  }))
}

import type { AgentSessionAccepted } from '../../src/shared/agent-tools'

export interface ToolSessionRequest {
  fingerprint: string
  requestedSessionId?: string
  accepted: AgentSessionAccepted
}

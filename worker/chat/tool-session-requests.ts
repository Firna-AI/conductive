import type { AgentSessionAccepted } from '../../src/shared/agent-sessions'

export interface ToolSessionRequest {
  fingerprint: string
  requestedSessionId?: string
  accepted: AgentSessionAccepted
}

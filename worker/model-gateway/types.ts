import type { AgentLogin } from '../chat/login-kind'

export type TurnTokenCheck =
  | { ok: true; login: AgentLogin }
  | {
      ok: false
      reason:
        | 'turn_token_invalid'
        | 'turn_not_active'
        | 'agent_login_changed'
        | 'agent_login_unavailable'
    }

export interface TurnTokenEndpoint {
  checkTurnToken(token: string): Promise<TurnTokenCheck>
}

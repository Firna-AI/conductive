import type { RunnerLogin } from '../../src/shared/runner'

export type TurnTokenCheck =
  | { ok: true; login: RunnerLogin }
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

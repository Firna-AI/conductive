import type { AccountResponse } from '../shared/account'
import type { Agent } from '../shared/generated/Agent'
import type { AgentLogins } from './agent-logins'
import {
  contradictsLogin,
  loginObservationKey,
  type LoginObservation,
} from './login-observation'

interface Fact {
  observation: LoginObservation
  at: number
  readVersion: number
}

/** Orders dispatched account GETs and record-scoped facts without writing login data. */
export class AccountLoginFacts {
  private count = 0
  private readonly observations = new Map<string, Fact>()
  private readonly replies = new Map<Agent, number>()
  private readonly logins: AgentLogins

  constructor(logins: AgentLogins) {
    this.logins = logins
  }

  begin(): number {
    return ++this.count
  }

  observe(
    account: AccountResponse,
    observation: LoginObservation,
  ): number | null {
    if (
      observation.login?.type === 'personal' &&
      observation.login.userId !== account.user.id
    )
      return null
    const key = loginObservationKey(observation)
    if (
      this.observations.get(key)?.observation.available ===
      observation.available
    )
      return null
    const at = this.begin()
    this.observations.set(key, {
      observation,
      at,
      readVersion: this.logins.readVersion(observation.agent),
    })
    return at
  }

  current(observation: LoginObservation): boolean {
    const before = this.observations.get(loginObservationKey(observation))
    return (
      before?.observation.available === observation.available &&
      this.logins.readVersion(observation.agent) > before.readVersion
    )
  }

  /** Only a later fact that contradicts this answer prevents it from showing. */
  accept(
    account: AccountResponse,
    agent: Agent,
    at: number,
  ): { kind: 'accepted' | 'old' } | { kind: 'repair'; after: number } {
    if (at < (this.replies.get(agent) ?? 0)) return { kind: 'old' }
    const contradictions = [...this.observations.values()].filter(
      (fact) =>
        fact.at > at &&
        fact.observation.agent === agent &&
        contradictsLogin(account, fact.observation),
    )
    if (contradictions.length)
      return {
        kind: 'repair',
        after: Math.max(...contradictions.map((fact) => fact.at)),
      }
    this.replies.set(agent, at)
    return { kind: 'accepted' }
  }
}

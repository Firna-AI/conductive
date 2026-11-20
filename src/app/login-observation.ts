import type { Agent } from '../shared/generated/Agent'
import type { SessionLogin } from '../shared/generated/SessionLogin'
import type { AccountResponse } from '../shared/account'
import { loginUsable } from './api/read-core'
import { newSessionLogin } from './default-logins'

/** A login status from a newer record, without account data to merge. */
export interface LoginObservation {
  agent: Agent
  orgId: string
  /** Null means availability describes the default of the reader's empty session. */
  login: SessionLogin | null
  available: boolean
  /** The record's stable identity, when several records name one login. */
  source?: string
}

/** The fact's owner and scope stay the same across repeated records. */
export function loginObservationKey(observation: LoginObservation): string {
  const { agent, orgId, login, source } = observation
  return JSON.stringify([
    source,
    orgId,
    agent,
    login?.type ?? null,
    login?.type === 'personal' ? login.userId : login?.orgId,
  ])
}

/** Only a contradiction requests account data. No observation writes it. */
export function contradictsLogin(
  account: AccountResponse,
  observation: LoginObservation,
): boolean {
  const { agent, orgId, login, available } = observation
  if (login === null) {
    return (newSessionLogin(account, orgId, agent) !== null) !== available
  }
  const own = login.type === 'personal' && login.userId === account.user.id
  if (login.type === 'personal' && !own) return false
  const usable =
    own && loginUsable(account.agentLogins.find((item) => item.agent === agent))
  const entry = account.defaultLogins?.find(
    (item) => item.agent === agent && item.orgId === orgId,
  )
  if (available) return own ? !usable : entry?.login === null
  const named = entry?.login
  return (
    usable ||
    (named?.type === login.type &&
      (named.type === 'personal'
        ? named.userId === account.user.id
        : named.orgId === orgId))
  )
}

import type { Session } from '../../shared/generated/Session'
import { readSessions } from '../../chat/api/read-responses'
import { sessionsPath } from '../../shared/sessions'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import type { FetchLike } from '../api/client'
import { devDefaultLogins } from './default-logins'
import type { DevOptions } from './options'
import { ID, json, type Route } from './router'
import type { DevState } from './state'

/**
 * The empty session of `sessionLogin=empty`: Cal opened it with + and has
 * sent no message in it, with the choice of `first`. Its record names the
 * default login of Cal for that agent, which its first message takes, as
 * the Worker does: the org login while its switch "Use for every member"
 * is on, and else the own login of Cal. The record keeps no login before
 * that message. While Cal is not the person signed in, the fake takes his
 * logins from the fixtures.
 */
function startedSession(
  state: DevState,
  orgId: string,
  first: Session,
): Session {
  const account =
    state.account.user.id === fakeUser.id
      ? state.account
      : coreFixtures('admin').account
  const { agent } = first.choice
  const login =
    devDefaultLogins({ ...state, account }).find(
      (entry) => entry.orgId === orgId && entry.agent === agent,
    )?.login ?? null
  const own = account.agentLogins.find((item) => item.agent === agent)
  return {
    id: 'dev-started-session',
    workspaceId: first.workspaceId,
    title: null,
    choice: first.choice,
    createdAt: FAKE_TIME,
    closedAt: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    retryMessageId: null,
    startedBy: senderSnapshot(fakeUser),
    sourceSessionId: null,
    loginAvailable: login !== null,
    loginShared:
      login?.type === 'org' || (own?.connected === true && !own.noReuse),
    ...(login ? { defaultLogin: login } : {}),
  }
}

/**
 * The sessions of `checkout-autocomplete` for `sessionLogin`. With `org`
 * and `removed`, each recorded session is on the org login of Acme, as the
 * Worker records a session whose first message took that login. With
 * `removed`, an admin removed that login later, so each record says that
 * it is not available. The org login has no share setting, so each record
 * says that it is shared. With `empty`, the recorded sessions stay, and
 * the empty session of `startedSession` follows them. Each other workspace
 * keeps its recorded sessions.
 */
export function sessionLoginRoutes(
  mode: DevOptions['sessionLogin'],
  recorded: FetchLike,
  state: DevState,
): Route[] {
  if (mode === null) return []
  const sessionsOf = async (org: string, workspace: string) => {
    const reply = await recorded(sessionsPath(org, workspace))
    const list = readSessions(await reply.json())
    const [first] = list.sessions
    if (mode === 'empty') {
      return json({
        ...list,
        sessions: first
          ? [...list.sessions, startedSession(state, org, first)]
          : list.sessions,
      })
    }
    const change = (session: Session): Session => ({
      ...session,
      login: { type: 'org', orgId: org },
      loginAvailable: mode === 'org',
      loginShared: true,
    })
    return json({
      ...list,
      sessions: list.sessions.map(change),
      history: list.history.map(change),
    })
  }
  return [
    {
      method: 'GET',
      path: sessionsPath(ID.org, ID.workspace),
      answer: ({ params }) =>
        params.workspace === FAKE_IDS.workspace
          ? sessionsOf(params.org, params.workspace)
          : null,
    },
  ]
}

import type { Session } from '../../shared/generated/Session'
import { readSessions } from '../../chat/api/read-responses'
import { sessionsPath } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { FetchLike } from '../api/client'
import type { DevOptions } from './options'
import { ID, json, type Route } from './router'

/**
 * The sessions of `checkout-autocomplete` for `sessionLogin=org|removed`:
 * the recorded sessions, each on the org login of Acme, as the Worker
 * records a session whose first message took that login. With `removed`,
 * an admin removed that login later, so each record says that it is not
 * available. The org login has no share setting, so each record says that
 * it is shared. Each other workspace keeps its recorded sessions.
 */
export function sessionLoginRoutes(
  mode: DevOptions['sessionLogin'],
  recorded: FetchLike,
): Route[] {
  if (mode === null) return []
  const onOrgLogin = async (org: string, workspace: string) => {
    const reply = await recorded(sessionsPath(org, workspace))
    const list = readSessions(await reply.json())
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
          ? onOrgLogin(params.org, params.workspace)
          : null,
    },
  ]
}

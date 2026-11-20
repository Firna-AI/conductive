import type { DefaultAgentLogin } from '../../shared/generated/DefaultAgentLogin'
import type { SessionLogin } from '../../shared/generated/SessionLogin'
import { AGENTS, loginUsable } from '../api/read-core'
import type { DevState } from './state'

/**
 * The default login of the user for each org and agent, as the resolver of
 * the Worker names them: the org login while its switch "Use for every
 * member" is on, then the own login that the app can use, then the org
 * login (org login decisions 4, 6 A, and 7 B). A deleted org has none, and
 * a suspended org names no login and no model list. The dev fake stands in
 * for the Worker, so it works out the order here.
 */
export function devDefaultLogins(state: DevState): DefaultAgentLogin[] {
  const userId = state.account.user.id
  return state.orgs
    .filter(({ org }) => !org.deletion)
    .flatMap(({ org }) =>
      AGENTS.map((agent): DefaultAgentLogin => {
        const active = org.suspension === undefined
        const own = state.account.agentLogins.find(
          (login) => login.agent === agent,
        )
        const orgLogin = active
          ? state.orgLogins.get(org.id)?.get(agent)
          : undefined
        const personal: SessionLogin | null =
          active && loginUsable(own) ? { type: 'personal', userId } : null
        const shared: SessionLogin | null = orgLogin
          ? { type: 'org', orgId: org.id }
          : null
        const login =
          shared && orgLogin?.useForEveryMember ? shared : (personal ?? shared)
        const orgList =
          orgLogin?.kind === 'endpoint' ? orgLogin.modelList : undefined
        const ownList =
          own?.connected && own.kind === 'endpoint' ? own.modelList : undefined
        const modelList = login?.type === 'org' ? orgList : ownList
        return {
          orgId: org.id,
          orgName: org.name,
          agent,
          login,
          ...(login && modelList ? { modelList } : {}),
          ...(orgList ? { orgModelList: orgList } : {}),
        }
      }),
    )
}

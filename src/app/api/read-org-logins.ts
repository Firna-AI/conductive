import type {
  OrgAgentLoginsResponse,
  OrgAgentLoginStatus,
} from '../../shared/org-agent-logins'
import { choice, count, flag, items, nested, record, text } from './parse'
import { AGENTS, readDefaultLogins, readEndpointModelList } from './read-core'

type OrgLoginKind = Extract<OrgAgentLoginStatus, { connected: true }>['kind']

/** The kinds of an org login: an API key or an own endpoint. */
const ORG_LOGIN_KINDS: readonly OrgLoginKind[] = ['api-key', 'endpoint']

/**
 * The org login of one agent, as each member of the org reads it: its
 * kind, the host of an own endpoint, and the switch "Use for every
 * member". Only an admin gets the last model list of an own endpoint. No
 * answer holds the key or the full address.
 */
export function readOrgLogin(value: unknown): OrgAgentLoginStatus {
  const login = record(value, 'org login')
  const agent = choice(login, 'agent', AGENTS)
  if (!flag(login, 'connected')) return { agent, connected: false }
  const saved = {
    agent,
    connected: true as const,
    useForEveryMember: flag(login, 'useForEveryMember'),
    updatedAt: count(login, 'updatedAt'),
  }
  if (choice(login, 'kind', ORG_LOGIN_KINDS) === 'api-key') {
    return { ...saved, kind: 'api-key' }
  }
  return {
    ...saved,
    kind: 'endpoint',
    host: text(login, 'host'),
    ...(login.modelList === undefined
      ? {}
      : { modelList: nested(login, 'modelList', readEndpointModelList) }),
  }
}

/**
 * The org logins of an org, one for each agent, and the default logins of
 * the person in that org, which the resolver of the Worker names (org login
 * decision 6 F), as `readDefaultLogins` says.
 */
export function readOrgLogins(value: unknown): OrgAgentLoginsResponse {
  const reply = record(value, 'org logins')
  return {
    agentLogins: items(reply, 'agentLogins', readOrgLogin),
    ...readDefaultLogins(reply),
  }
}

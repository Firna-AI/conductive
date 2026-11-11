import type { SaveAgentLoginRequest } from '../../shared/account'
import type { Agent } from '../../shared/agents'

/**
 * How an agent connects: Claude with a subscription token, an API key, or
 * an own endpoint, and Codex with an API key or an own endpoint.
 */
export type LoginKind = SaveAgentLoginRequest['kind']

/** The kinds of each agent, in the order of its Connect form. */
export const agentLoginKinds: Readonly<
  Record<Agent, readonly [LoginKind, ...LoginKind[]]>
> = {
  claude: ['token', 'api-key', 'endpoint'],
  codex: ['api-key', 'endpoint'],
}

/** The names of the agents in the rows of the account and of Get started. */
export const agentNames: Readonly<Record<Agent, string>> = {
  claude: 'Claude',
  codex: 'Codex',
}

/** The label of the kind of a login, which the account shows with it. */
export const loginLabels: Readonly<Record<LoginKind, string>> = {
  token: 'Subscription token',
  'api-key': 'API key',
  endpoint: 'Own endpoint',
}

/** A number of repositories, such as "1 repository" or "6 repositories". */
export function repositoryCount(count: number): string {
  return count === 1 ? '1 repository' : `${count} repositories`
}

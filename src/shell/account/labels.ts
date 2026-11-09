import type { SaveAgentLoginRequest } from '../../shared/account'
import type { Agent } from '../../shared/agents'

/**
 * How an agent connects: Claude with a subscription token or an API key,
 * and Codex with an API key or an access token. Both tokens are of the
 * kind `token`.
 */
export type LoginKind = SaveAgentLoginRequest['kind']

/** The names of the agents in the rows of the account and of Get started. */
export const agentNames: Readonly<Record<Agent, string>> = {
  claude: 'Claude',
  codex: 'Codex',
}

/**
 * The name of each kind of login, by agent, which is all that the app shows
 * of a login. OpenAI calls the token of Codex an access token, so members
 * find it under that name in ChatGPT.
 */
export const loginLabels: Readonly<
  Record<Agent, Readonly<Record<LoginKind, string>>>
> = {
  claude: { token: 'Subscription token', 'api-key': 'API key' },
  codex: { token: 'Access token', 'api-key': 'API key' },
}

/** A number of repositories, such as "1 repository" or "6 repositories". */
export function repositoryCount(count: number): string {
  return count === 1 ? '1 repository' : `${count} repositories`
}

import type { AgentLoginStatus } from '../../shared/account'
import type { Agent } from '../../shared/agents'

/**
 * How an agent connects: Claude with a subscription token or an API key,
 * and Codex with an API key or a sign-in to the ChatGPT plan of the user.
 * The Claude token and the ChatGPT sign-in are both of the kind `token`.
 */
export type LoginKind = Extract<AgentLoginStatus, { connected: true }>['kind']

/** The names of the agents in the rows of the account and of Get started. */
export const agentNames: Readonly<Record<Agent, string>> = {
  claude: 'Claude',
  codex: 'Codex',
}

/**
 * The name of each kind of login, by agent, which is all that the app shows
 * of a login. The ChatGPT sign-in of Codex shows as the plan that Codex then
 * runs on, as `loginLabels` of the mockup fixtures names it.
 */
export const loginLabels: Readonly<
  Record<Agent, Readonly<Record<LoginKind, string>>>
> = {
  claude: { token: 'Subscription token', 'api-key': 'API key' },
  codex: { token: 'ChatGPT plan', 'api-key': 'API key' },
}

/** A number of repositories, such as "1 repository" or "6 repositories". */
export function repositoryCount(count: number): string {
  return count === 1 ? '1 repository' : `${count} repositories`
}

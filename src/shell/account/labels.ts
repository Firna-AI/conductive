import type { SaveAgentLoginRequest } from '../../shared/account'
import type { Agent } from '../../shared/agents'

/**
 * How an agent connects: Claude with a subscription token or an API key,
 * and Codex with an API key.
 */
export type LoginKind = 'token' | 'api-key'

/** The names of the agents in the rows of the account and of Get started. */
export const agentNames: Readonly<Record<Agent, string>> = {
  claude: 'Claude',
  codex: 'Codex',
}

/** The kind of a login, which is all that the app shows of it. */
export const loginLabels: Readonly<
  Record<SaveAgentLoginRequest['kind'], string>
> = {
  token: 'Subscription token',
  'api-key': 'API key',
  endpoint: 'Own endpoint',
}

/** A number of repositories, such as "1 repository" or "6 repositories". */
export function repositoryCount(count: number): string {
  return count === 1 ? '1 repository' : `${count} repositories`
}

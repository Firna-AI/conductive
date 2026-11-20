import type { Agent } from '../../shared/generated/Agent'
import type { AgentLoginStatus } from '../../shared/account'

/** The connected login kinds. Both agents support own endpoints. */
export type LoginKind = Extract<AgentLoginStatus, { connected: true }>['kind']

/** The names of the agents in the rows of the account and of Get started. */
export const agentNames: Readonly<Record<Agent, string>> = {
  claude: 'Claude',
  codex: 'Codex',
}

/** A number of repositories, such as "1 repository" or "6 repositories". */
export function repositoryCount(count: number): string {
  return count === 1 ? '1 repository' : `${count} repositories`
}

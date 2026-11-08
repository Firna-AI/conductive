import type { AgentKey } from './agents'

/**
 * How a user connects an agent: Claude with a subscription token from
 * `claude setup-token` or an Anthropic API key, and Codex with an OpenAI
 * API key (decisions 24 and 37).
 */
export type LoginKind = 'token' | 'api-key'

export const loginLabels: Readonly<Record<LoginKind, string>> = {
  token: 'Subscription token',
  'api-key': 'API key',
}

/** The agents that a user connected, and how. */
export type AgentLogins = Readonly<Partial<Record<AgentKey, LoginKind>>>

/** The logins of the account: Claude with a token, Codex with an API key. */
export const accountLogins: AgentLogins = { claude: 'token', codex: 'api-key' }

/**
 * Whether a new login lets other members use it in the sessions of its
 * owner. A Claude subscription is for one person, so it starts off. An API
 * key starts on, because its owner may let a team use it.
 */
export const sharedByDefault: Readonly<Record<LoginKind, boolean>> = {
  token: false,
  'api-key': true,
}

/**
 * The cause of a change of the share setting that the app did not save: the
 * message of a failed save of the server.
 */
export const shareNotSavedCause = 'The request failed. Try again.'

/** The command that makes a Claude subscription token on the own computer. */
export const claudeTokenCommand = 'claude setup-token'

/** The page where a user makes an OpenAI API key for Codex. */
export const openAiKeyPage = 'https://platform.openai.com/api-keys'

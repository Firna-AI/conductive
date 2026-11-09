import type { AgentKey } from './agents'

/**
 * How a user connects an agent: Claude with a subscription token from
 * `claude setup-token` or an Anthropic API key, and Codex with an OpenAI
 * API key or a Codex access token from a ChatGPT Business or Enterprise
 * workspace (decisions 24, 37, and 170). Both tokens are of the kind
 * `token`.
 */
export const loginKinds = ['token', 'api-key'] as const

export type LoginKind = (typeof loginKinds)[number]

/**
 * The name of each kind of login, by agent. OpenAI calls the token of Codex
 * an access token, so members find it under that name in ChatGPT.
 */
export const loginLabels: Readonly<
  Record<AgentKey, Readonly<Record<LoginKind, string>>>
> = {
  claude: { token: 'Subscription token', 'api-key': 'API key' },
  codex: { token: 'Access token', 'api-key': 'API key' },
}

/**
 * The kinds of each agent in the order of the switch of its Connect form.
 * The first kind starts selected. Most members have an OpenAI API key, and
 * a Codex access token needs a Business or Enterprise workspace, so the API
 * key comes first for Codex.
 */
export const connectKinds: Readonly<
  Record<AgentKey, readonly [LoginKind, ...LoginKind[]]>
> = {
  claude: ['token', 'api-key'],
  codex: ['api-key', 'token'],
}

/** The agents that a user connected, and how. */
export type AgentLogins = Readonly<Partial<Record<AgentKey, LoginKind>>>

/** The logins of the account: Claude with a token, Codex with an API key. */
export const accountLogins: Readonly<Record<AgentKey, LoginKind>> = {
  claude: 'token',
  codex: 'api-key',
}

/**
 * Whether a new login lets other members use it in the sessions of its
 * owner, by agent and kind (decisions 116 and 171). A Claude subscription
 * is for one person, and a personal Codex access token acts as the member
 * who made it, so both tokens start off. An API key starts on, because its
 * owner may let a team use it.
 */
export const sharedByDefault: Readonly<
  Record<AgentKey, Readonly<Record<LoginKind, boolean>>>
> = {
  claude: { token: false, 'api-key': true },
  codex: { token: false, 'api-key': true },
}

/**
 * The cause of a change of the share setting that the app did not save: the
 * message of a failed save of the server.
 */
export const shareNotSavedCause = 'The request failed. Try again.'

/** The command that makes a Claude subscription token on the own computer. */
export const claudeTokenCommand = 'claude setup-token'

/** The page where a user makes an Anthropic API key for Claude. */
export const anthropicKeyPage = 'https://console.anthropic.com/settings/keys'

/** The page where a user makes an OpenAI API key for Codex. */
export const openAiKeyPage = 'https://platform.openai.com/api-keys'

/** The page of ChatGPT where a member makes a Codex access token. */
export const codexTokenPage = 'https://chatgpt.com/admin/access-tokens'

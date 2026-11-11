import { chatGptSignInCopy } from '../components/settings/chatGptSignInCopy'
import type { AgentKey } from './agents'

/**
 * How a user connects an agent: Claude with a subscription token from
 * `claude setup-token` or an Anthropic API key, and Codex with an OpenAI
 * API key or a device code sign-in to the ChatGPT plan of the user
 * (decisions 24, 37, and 175). The Claude token and the ChatGPT sign-in
 * are both of the kind `token`.
 */
export const loginKinds = ['token', 'api-key'] as const

export type LoginKind = (typeof loginKinds)[number]

/**
 * The name of each kind of login, by agent. The ChatGPT sign-in of Codex
 * shows as the plan that Codex then runs on.
 */
export const loginLabels: Readonly<
  Record<AgentKey, Readonly<Record<LoginKind, string>>>
> = {
  claude: { token: 'Subscription token', 'api-key': 'API key' },
  codex: { token: 'ChatGPT plan', 'api-key': 'API key' },
}

/**
 * The kinds of each agent in the order of the switch of its Connect form.
 * The first kind starts selected. An OpenAI API key needs no step before
 * it, and the ChatGPT sign-in needs a setting of ChatGPT first, so the API
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
 * owner, by agent and kind (decisions 116, 171, and 175). A Claude
 * subscription is for one person, and the terms of OpenAI forbid making a
 * ChatGPT account available to anyone else, so both tokens start off. An
 * API key starts on, because its owner may let a team use it.
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

/** The page of OpenAI where a user enters the code of a ChatGPT sign-in. */
export const chatGptDevicePage = 'https://auth.openai.com/codex/device'

/** The one-time code that OpenAI gave for a ChatGPT sign-in. */
export const chatGptCode = 'HZQW-7KMT'

/**
 * The cause of a ChatGPT sign-in that OpenAI refused, because device code
 * sign-in is off for the ChatGPT account of the user.
 */
export const signInRefusedCause: string = chatGptSignInCopy.causes.refused

/**
 * The cause of a Codex login that the app can no longer use, as the field
 * `unusableCause` of the login status carries it: OpenAI did not renew the
 * ChatGPT sign-in.
 */
export const codexUnusableCause: string = chatGptSignInCopy.causes.notRenewed

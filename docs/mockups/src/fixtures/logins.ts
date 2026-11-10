import type { AgentKey } from './agents'

/**
 * How a user connects an agent: Claude with a subscription token from
 * `claude setup-token` or an Anthropic API key (decisions 24 and 37), and
 * Codex with an OpenAI API key. Both agents can also run on an own
 * endpoint, such as a gateway or a proxy, with its address and its key.
 */
export type LoginKind = 'token' | 'api-key' | 'endpoint'

export const loginLabels: Readonly<Record<LoginKind, string>> = {
  token: 'Subscription token',
  'api-key': 'API key',
  endpoint: 'Own endpoint',
}

/** The kinds of each agent, in the order of its Connect form. */
export const agentLoginKinds: Readonly<
  Record<AgentKey, readonly [LoginKind, ...LoginKind[]]>
> = {
  claude: ['token', 'api-key', 'endpoint'],
  codex: ['api-key', 'endpoint'],
}

/**
 * A connected login, as the account shows it: its kind, and the host of an
 * own endpoint. The key and the full address never go back to the browser.
 */
export type AgentLogin =
  { kind: 'token' | 'api-key' } | { kind: 'endpoint'; host: string }

/** The agents that a user connected, and how. */
export type AgentLogins = Readonly<Partial<Record<AgentKey, AgentLogin>>>

/** The logins of the account: Claude with a token, Codex with an API key. */
export const accountLogins: AgentLogins = {
  claude: { kind: 'token' },
  codex: { kind: 'api-key' },
}

/** The host of Cal's proxy, which serves both agents. */
const endpointHost = 'proxy.example.com'

/** The logins of the account after Cal connected both agents to the proxy. */
export const endpointLogins: AgentLogins = {
  claude: { kind: 'endpoint', host: endpointHost },
  codex: { kind: 'endpoint', host: endpointHost },
}

/**
 * Whether a new login lets other members use it in the sessions of its
 * owner. A Claude subscription is for one person, so it starts off. An API
 * key starts on, because its owner may let a team use it. An own endpoint
 * starts on too, like an API key, and its owner can turn it off.
 */
export const sharedByDefault: Readonly<Record<LoginKind, boolean>> = {
  token: false,
  'api-key': true,
  endpoint: true,
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

/**
 * How each agent program calls an own endpoint. Claude takes the base
 * address without `/v1`, and Codex takes it with `/v1`, as `basePath` says.
 * Each program adds `requestPath` to the address.
 */
export const endpointApis: Readonly<
  Record<AgentKey, { name: string; basePath: string; requestPath: string }>
> = {
  claude: {
    name: 'the Anthropic Messages API',
    basePath: '',
    requestPath: '/v1/messages',
  },
  codex: {
    name: 'the OpenAI Responses API',
    basePath: '/v1',
    requestPath: '/responses',
  },
}

/** The origin of the example address that the form shows. */
export const exampleEndpointOrigin = 'https://gateway.example.com'

/**
 * The origin of an address that the save refuses: `http://` with a host
 * that is not `localhost`, `127.0.0.1`, or `[::1]`. The refusal names the
 * fix.
 */
export const refusedEndpoint = {
  origin: `http://${endpointHost}:8317`,
  cause:
    'Use an https:// address. Only localhost, 127.0.0.1, and [::1] can use http://.',
} as const

/** A key in its field, which shows only as dots. */
export const pastedKey = 'pasted-key-of-the-endpoint'

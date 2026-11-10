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
 * How the gateway calls an own endpoint for each agent. The base address of
 * Claude has no `/v1`, and the base address of Codex ends with `/v1`, as
 * `basePath` says. The gateway adds `requestPath` of the agent program to
 * the base address.
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
 * The address of Cal's proxy as Cal types it for each agent, and the base
 * address that the form saves from it. One shared rule checks the address
 * and builds each request address from it. It keeps a query, and it drops
 * a fragment, a trailing slash, and a final `/v1` of a Claude address.
 */
export const typedEndpoints: Readonly<
  Record<AgentKey, { typed: string; saved: string }>
> = {
  claude: {
    typed: `https://${endpointHost}/v1/`,
    saved: `https://${endpointHost}`,
  },
  codex: {
    typed: `https://${endpointHost}/v1/`,
    saved: `https://${endpointHost}/v1`,
  },
}

/**
 * The origin of an address that the rule refuses: a proxy on Cal's own
 * computer, on `http://`. The gateway calls each endpoint over the internet,
 * so the rule accepts only an `https://` address with a public host and no
 * user name or password. It refuses `localhost` and each IP address that is
 * not public, names of one label, internal names, and the names of the app
 * and of its previews. The refusal names the rule in plain words.
 */
export const refusedEndpoint = {
  origin: 'http://localhost:8317',
  cause: 'Use a public https:// address, without a user name or a password.',
} as const

/** A key in its field, which shows only as dots. */
export const pastedKey = 'pasted-key-of-the-endpoint'

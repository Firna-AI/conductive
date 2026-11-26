import type { AgentLoginStatus } from '../../../shared/account'
import type { Agent } from '../../../shared/generated/Agent'
import { productName } from '../../../shared/brand'

/** The kind of a connected login, as the account API names it. */
type LoginKind = Extract<AgentLoginStatus, { connected: true }>['kind']

/** The kinds of each agent, in the order of a switch. */
type KindOrder = Readonly<Record<Agent, readonly [LoginKind, ...LoginKind[]]>>

/**
 * The name of each kind of login, by agent, which is all that the app and
 * the mockups show of a login. The ChatGPT sign-in of Codex shows as the
 * plan that Codex then runs on.
 */
export const loginLabels: Readonly<
  Record<Agent, Readonly<Record<LoginKind, string>>>
> = {
  claude: {
    token: 'Subscription token',
    'api-key': 'API key',
    endpoint: 'Own endpoint',
  },
  codex: {
    token: 'ChatGPT plan',
    'api-key': 'API key',
    endpoint: 'Own endpoint',
  },
}

/**
 * The kinds of each agent in the order of the switch of its Connect form.
 * The first kind starts selected. An OpenAI API key needs no step before
 * it, and the ChatGPT sign-in needs a setting of ChatGPT first, so the API
 * key comes first for Codex.
 */
export const connectKinds: KindOrder = {
  claude: ['token', 'api-key', 'endpoint'],
  codex: ['api-key', 'token', 'endpoint'],
}

/**
 * The kinds of an org login, in the order of the switch of its form: an
 * API key or an own endpoint. The first kind starts selected. An org login
 * is never a subscription token or a ChatGPT sign-in, because each of those
 * is for one person.
 */
export const orgConnectKinds: KindOrder = {
  claude: ['api-key', 'endpoint'],
  codex: ['api-key', 'endpoint'],
}

/** The account of each agent that an API key belongs to. */
const keyAccounts: Readonly<Record<Agent, string>> = {
  claude: 'Anthropic',
  codex: 'OpenAI',
}

/** The page where a user makes an API key for each agent. */
const keyPages: Readonly<Record<Agent, string>> = {
  claude: 'https://console.anthropic.com/settings/keys',
  codex: 'https://platform.openai.com/api-keys',
}

/** The API that the own endpoint of each agent serves. */
const endpointApis: Readonly<Record<Agent, string>> = {
  claude: 'the Anthropic Messages API',
  codex: 'the OpenAI Responses API',
}

/**
 * The example base address of an own endpoint of each agent. A Claude base
 * has no `/v1`, and a Codex base ends with it.
 */
const endpointExamples: Readonly<Record<Agent, string>> = {
  claude: 'https://gateway.example.com',
  codex: 'https://gateway.example.com/v1',
}

/**
 * The words of the Connect form of an agent login, which the form of the
 * app and the form of the mockups both draw. A text with a command or a
 * link comes in plain parts, and each form draws the command and the link
 * with its own parts. Each form keeps the hint under the field of a
 * secret. This module imports no fixture and no React, so the app can
 * import the same words.
 */
export const agentConnectCopy = {
  /** The spoken name of the switch of the kinds. */
  switchLabel: 'Connect with',
  /**
   * The subscription token of Claude: the words before and after the
   * command that makes it on the own computer, and its field.
   */
  token: {
    before: 'Run',
    command: 'claude setup-token',
    after: 'on your computer, then paste the token that it prints.',
    label: loginLabels.claude.token,
    placeholder: 'Paste the token',
  },
  /**
   * An API key: the words before the link to the page that makes a key,
   * the words and the address of that link, and the field.
   */
  key: {
    /**
     * Whose account the key belongs to: the account of the user, or the
     * account of the org of an org login, such as "Acme's".
     */
    whose: { own: 'your', org: (org: string) => `${org}'s` },
    text: (agent: Agent, whose: string) =>
      `Paste an API key of ${whose} ${keyAccounts[agent]} account.`,
    link: (agent: Agent) => `Make one on ${keyAccounts[agent]}`,
    pages: keyPages,
    label: (agent: Agent) => `${keyAccounts[agent]} API key`,
    placeholder: 'Paste the key',
  },
  /**
   * An own endpoint: what it must serve, the field of its address with the
   * hint under it, and the label of the field of its key. That field takes
   * the placeholder of an API key.
   */
  endpoint: {
    /**
     * What the endpoint must serve. `models` names the models that the app
     * offers for the agent, such as "Opus 5.5 and Fable 5.1", when the form
     * names them.
     */
    serves: (agent: Agent, models?: string) => {
      const offered =
        models === undefined
          ? ''
          : `, with the models that ${productName} offers: ${models}`
      return `Use a gateway or a proxy that serves ${endpointApis[agent]}${offered}.`
    },
    addressLabel: 'Endpoint',
    /** The placeholder of the address: the example base address. */
    examples: endpointExamples,
    /**
     * The hint under the address: where the requests of the agent go,
     * through the app. `saved` names the address that the form saves, when
     * the shared rule changes the typed address.
     */
    addressHint: (upstream: string, saved?: string) => {
      const saves = saved === undefined ? '' : `Saves as ${saved}. `
      return `${saves}Requests go through ${productName} to ${upstream}.`
    },
    keyLabel: 'API key',
  },
} as const

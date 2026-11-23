import type { EndpointEntry } from '../../../components/settings/EndpointFields'
import type { LoginOwner } from '../../../../../../src/ui/components/settings/EndpointModels'
import { signInSteps } from '../../../../../../src/ui/components/settings/chatGptSignInCopy'
import { agentKeys } from '../../../fixtures/agents'
import { loginKinds } from '../../../fixtures/logins'

/** The agents of the app, as `AgentKey` lists them. */
export const agentKeySchema = { enum: agentKeys } as const

/** What the address field of an own endpoint holds, as `EndpointEntry`. */
const endpointEntries = [
  'empty',
  'typed',
  'refused',
] as const satisfies readonly EndpointEntry[]

/** What the endpoint field of a Connect form holds. */
export const endpointEntrySchema = { enum: endpointEntries } as const

/** Who owns an own endpoint login, as `LoginOwner` lists them. */
const loginOwners = ['personal', 'org'] as const satisfies readonly LoginOwner[]

/** Who owns an own endpoint login: a member, or the org. */
export const loginOwnerSchema = { enum: loginOwners } as const

/** The step of the ChatGPT sign-in of Codex, as `SignInStep`. */
export const signInStepSchema = { enum: signInSteps } as const

/** The last read of the model list of an own endpoint, as `ModelListCheck`. */
export const modelListCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['unlisted', 'checked'],
  properties: {
    /** The models of the app that the list does not name. */
    unlisted: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'id'],
        properties: { label: { type: 'string' }, id: { type: 'string' } },
      },
    },
    /** When the last read that worked ran, such as `4 minutes ago`. */
    checked: { type: 'string' },
  },
} as const

/** A connected own endpoint login, as `EndpointLogin`. */
export const endpointLoginSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'host'],
  properties: {
    kind: { const: 'endpoint' },
    host: { type: 'string' },
    models: modelListCheckSchema,
    /** The last read of the model list failed. */
    readFailed: { type: 'boolean' },
    /** The save added `/v1` to the typed address. */
    addedV1: { type: 'boolean' },
  },
} as const

/** A connected login, as `AgentLogin`: its kind, or an own endpoint. */
const agentLoginSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: { kind: { enum: ['token', 'api-key'] } },
    },
    endpointLoginSchema,
  ],
} as const

/** The logins of the agents that a person connected, as `AgentLogins`. */
const agentLoginsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { claude: agentLoginSchema, codex: agentLoginSchema },
} as const

/** The Connect form that is open under the row of an agent, as `OpenAgentForm`. */
const openAgentFormSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['agent', 'connectTo', 'cancel'],
  properties: {
    agent: agentKeySchema,
    kind: { enum: loginKinds },
    connectTo: { type: 'string', minLength: 1 },
    cancel: { type: 'boolean' },
    endpoint: endpointEntrySchema,
    signIn: signInStepSchema,
    /** The form replaces a connected login, so its main button says Replace. */
    replace: { type: 'boolean' },
    /** The cause of a save that failed, which a notice gives. */
    failed: { type: 'string' },
  },
} as const

/** A login that the app can no longer use, as `UnusableLogin`. */
const unusableLoginSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['agent', 'cause', 'signInTo'],
  properties: {
    agent: agentKeySchema,
    cause: { type: 'string' },
    signInTo: { type: 'string', minLength: 1 },
  },
} as const

/** The share settings under the logins: the agent whose change failed. */
export const loginSharesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['notSaved'],
  properties: { notSaved: { enum: [...agentKeys, null] } },
} as const

/** For each agent, the orgs whose org login serves the person, as `OrgLoginUse`. */
const orgLoginUseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claude: { type: 'array', items: { type: 'string' } },
    codex: { type: 'array', items: { type: 'string' } },
  },
} as const

/** The data of the list of the agents, as the props of `AgentList`. */
export const agentListProperties = {
  logins: agentLoginsSchema,
  /** The Connect form that is open under the row of an agent. */
  form: openAgentFormSchema,
  /** A login that the app can no longer use. */
  unusable: unusableLoginSchema,
  /** For each agent, the orgs whose org login serves the new sessions. */
  orgLogins: orgLoginUseSchema,
} as const

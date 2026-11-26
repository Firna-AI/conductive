import { agentKeys } from '../../../fixtures/agents'
import type { SecretRunItem } from '../../../fixtures/secretRequests'
import type { ValueLifetime } from '../../../../../../src/ui/components/chat/secretGrant'
import { personKeys } from '../layout/railSchemas'

/** The states of a run with secrets, as `SecretRunItem` lists them. */
const secretRunStates = [
  'waiting',
  'late',
  'allowed',
  'denied',
  'late-allowed',
  'late-denied',
  'not-answered',
] as const satisfies readonly SecretRunItem['state'][]

/** How long the value of a temporary request lasts, as `ValueLifetime`. */
const valueLifetimes = [
  'minutes',
  'workspace',
  'saved',
] as const satisfies readonly ValueLifetime[]

/** What ended a request with no answer, as `SecretRunItem` lists it. */
const requestEnds = [
  'archive',
  'suspension',
] as const satisfies readonly NonNullable<SecretRunItem['endedBy']>[]

/** One command with secrets and the reason of the agent. */
const secretRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['secrets', 'reason', 'command'],
  properties: {
    /** A secret of the org with its description, or a name to give. */
    secrets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          /** A new name with other characters than letters and digits. */
          invalidName: { const: true },
        },
      },
    },
    reason: { type: 'string' },
    command: { type: 'string' },
  },
} as const

/** An approval of the session by a member. */
const sessionGrant = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'by'],
  properties: { kind: { const: 'session' }, by: { enum: personKeys } },
} as const

/** A value that a member gave, with how long it lasts. */
const valueGrant = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'lifetime', 'by'],
  properties: {
    kind: { const: 'value' },
    lifetime: { enum: valueLifetimes },
    by: { enum: personKeys },
  },
} as const

/** A grant that a member gave, as `MemberGrant`. */
const memberGrantSchema = { anyOf: [sessionGrant, valueGrant] } as const

/** What lets a run use its secrets, as `SecretGrant`. */
const secretGrantSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: { kind: { const: 'all-agents' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: { kind: { const: 'pre-approved' } },
    },
    sessionGrant,
    valueGrant,
  ],
} as const

/** The login that a session keeps, as `KeptLogin`. */
const keptLoginSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'starter'],
      properties: {
        type: { const: 'personal' },
        starter: { enum: personKeys },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: { type: { const: 'org' } },
    },
  ],
} as const

/** How a late Allow reached the agent, as the `delivery` of a run. */
const lateDeliverySchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: { kind: { enum: ['turn', 'next-message'] } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'login', 'agent'],
      properties: {
        kind: { const: 'reconnect' },
        login: keptLoginSchema,
        agent: { enum: agentKeys },
      },
    },
  ],
} as const

/** A run of a command with secrets, at its place in the chat. */
export const secretRunItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'request', 'state'],
  properties: {
    kind: { const: 'secret-run' },
    id: { type: 'string', minLength: 1 },
    request: secretRequestSchema,
    state: { enum: secretRunStates },
    /** What let the run use its secrets, once it may. */
    grant: secretGrantSchema,
    /** The member who denied the request. */
    deniedBy: { enum: personKeys },
    delivery: lateDeliverySchema,
    /** The answer of a temporary request, as the card draws it. */
    draft: {
      type: 'object',
      additionalProperties: false,
      required: ['typed', 'lifetime'],
      properties: {
        typed: { type: 'boolean' },
        lifetime: { enum: valueLifetimes },
      },
    },
    endedBy: { enum: requestEnds },
  },
} as const

/** The line of a late Allow, which starts a turn, as `LateAnswerItem`. */
export const lateAnswerItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'names', 'grant'],
  properties: {
    kind: { const: 'late-answer' },
    id: { type: 'string', minLength: 1 },
    names: { type: 'array', items: { type: 'string' } },
    grant: memberGrantSchema,
  },
} as const

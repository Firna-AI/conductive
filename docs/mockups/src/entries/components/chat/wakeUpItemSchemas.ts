import { agentKeys } from '../../../fixtures/agents'
import { personKeys } from '../layout/railSchemas'
import { keptLoginSchema } from './secretItemSchemas'

/** The fields of each state of a wake-up, as `WakeUpItem` has them. */
const base = {
  kind: { const: 'wake-up' },
  id: { type: 'string', minLength: 1 },
  /** The time of the wake-up, in Unix milliseconds. */
  at: { type: 'integer', minimum: 0 },
  /** The text that the agent set. */
  text: { type: 'string', minLength: 1 },
} as const

const required = ['kind', 'id', 'at', 'text', 'state'] as const

/** Why a wake-up could start no turn, as `WakeUpMissCause`. */
const missSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: {
        kind: { enum: ['next-message', 'session-closed', 'archived'] },
      },
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

/** A wake-up of the agent in one of its states, as `WakeUpItem`. */
export const wakeUpItemSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required,
      properties: {
        ...base,
        state: { const: 'pending' },
        /** The whole text shows, as after a press on it. */
        open: { const: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required,
      properties: {
        ...base,
        state: { const: 'fired' },
        /** The time came while a turn ran: the line joins that turn. */
        during: { const: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required,
      properties: {
        ...base,
        state: { const: 'cancelled' },
        /** The member who pressed Cancel, while that member is in the org. */
        by: { enum: personKeys },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: [...required, 'from'],
      properties: {
        ...base,
        state: { const: 'cancelled' },
        /** The session link of the session whose agent cancelled it. */
        from: { type: 'string', minLength: 1 },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: [...required, 'miss'],
      properties: {
        ...base,
        state: { const: 'not-started' },
        miss: missSchema,
      },
    },
  ],
} as const

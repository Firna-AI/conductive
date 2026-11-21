import type { CapabilityChange } from '../../../components/chat/capabilityChangeCopy'
import { personKeys } from '../layout/railSchemas'

/** The kinds of a change that names secrets, as `CapabilityChange` lists them. */
const namedChangeKinds = [
  'pre-approved',
  'pre-approval-removed',
  'session-approval-removed',
  'value-given',
  'value-removed',
] as const satisfies readonly Exclude<CapabilityChange['kind'], 'mac-access'>[]

/** One change of the facts of a session, as `CapabilityChange`. */
const capabilityChangeSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'names'],
      properties: {
        kind: { enum: namedChangeKinds },
        names: { type: 'array', items: { type: 'string' } },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'on'],
      properties: {
        kind: { const: 'mac-access' },
        on: { type: 'boolean' },
      },
    },
  ],
} as const

/**
 * The note of a change of the capabilities of a workspace: who made it,
 * and each change of the facts of the session.
 */
export const capabilityChangedItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'by', 'changes'],
  properties: {
    kind: { const: 'capabilities-changed' },
    id: { type: 'string', minLength: 1 },
    by: { enum: personKeys },
    changes: { type: 'array', items: capabilityChangeSchema },
  },
} as const

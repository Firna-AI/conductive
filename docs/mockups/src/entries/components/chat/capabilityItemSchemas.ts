import type { CapabilityChange } from '../../../../../../src/ui/components/chat/capabilityChangeCopy'
import { personKeys } from '../layout/railSchemas'

/** The kinds of a change, as `CapabilityChange` lists them. */
const changeKinds = [
  'pre-approved',
  'pre-approval-removed',
  'session-approval-removed',
  'value-given',
  'value-removed',
] as const satisfies readonly CapabilityChange['kind'][]

/** One change of the facts of a session, as `CapabilityChange`. */
const capabilityChangeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'names'],
  properties: {
    kind: { enum: changeKinds },
    names: { type: 'array', items: { type: 'string' } },
  },
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

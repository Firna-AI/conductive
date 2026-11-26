import { ORG_COLORS } from '../../../../../../src/ui/design/orgColors'
import type { PersonKey } from '../../../fixtures/members'
import type { OrgKey } from '../../../fixtures/orgs'

/** The keys of the orgs of the fixtures, as `OrgKey` lists them. */
export const orgKeys = [
  'acme',
  'futex',
  'firna',
  'labs',
] as const satisfies readonly OrgKey[]

/** The keys of the people of the fixtures, as `PersonKey` lists them. */
export const personKeys = [
  'cal',
  'priya',
  'jonas',
] as const satisfies readonly PersonKey[]

/** An org of the fixtures as JSON, with the fields of `Org`. */
export const orgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'id', 'name', 'initials'],
  properties: {
    key: { enum: orgKeys },
    /** The ID of the org in the web addresses of the app. */
    id: { type: 'string' },
    name: { type: 'string' },
    /** Up to two letters, which the rail shows. */
    initials: { type: 'string' },
    /** The colour of the tile of the open org. Absent means Blue. */
    color: { enum: ORG_COLORS },
  },
} as const

/** A person of the fixtures as JSON, with the fields of `Person`. */
export const personSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'name', 'login', 'initials'],
  properties: {
    key: { enum: personKeys },
    name: { type: 'string' },
    login: { type: 'string' },
    initials: { type: 'string' },
  },
} as const

/** The state of the org rail as JSON, with the fields of `RailState`. */
export const railSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['orgs'],
  properties: {
    orgs: { type: 'array', items: orgSchema },
    /** The current org, or the create, account, and operator pages. */
    current: { enum: [...orgKeys, 'create', 'account', 'operator'] },
    /** The org, or Operator, whose name shows beside it, as on hover. */
    hint: { enum: [...orgKeys, 'operator'] },
    /** An org that the operator suspended. */
    suspended: { enum: orgKeys },
    /** No org exists yet, and nothing is connected. */
    firstRun: { type: 'boolean' },
    /** The person signed in runs the app for everyone. */
    operator: { type: 'boolean' },
    /** The person signed in, when it is not the account of the mockups. */
    person: personSchema,
    /** An org that the person drags to another place. */
    drag: {
      type: 'object',
      additionalProperties: false,
      required: ['org', 'index'],
      properties: {
        org: { enum: orgKeys },
        index: { type: 'integer', minimum: 0 },
      },
    },
    /** The org whose tile menu a right click opened. */
    menu: { enum: orgKeys },
    /** The workspace list of the hidden sidebar is open as a popover. */
    popover: { type: 'boolean' },
  },
} as const

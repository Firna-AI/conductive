import {
  membershipSchema,
  workspaceSchema,
} from '../workspaces/workspaceSchemas'

/** An open invite of an org, as `Invite`: its email and when it went. */
const inviteSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'sent'],
  properties: { email: { type: 'string' }, sent: { type: 'string' } },
} as const

/**
 * The members of an org as JSON, as the props of `MemberList` and
 * `MembersTab`: the members with their roles, the open invites, the
 * workspaces of the org with their owners, the person signed in, and
 * whether that person is an admin.
 */
export const memberListProperties = {
  members: { type: 'array', items: membershipSchema },
  invites: { type: 'array', items: inviteSchema },
  workspaces: { type: 'array', items: workspaceSchema },
  /** The person signed in. */
  viewer: membershipSchema.properties.person,
  /** The person signed in is an admin, who manages the members. */
  canManage: { type: 'boolean' },
} as const

/** The required props of the members of an org. */
export const memberListRequired = [
  'members',
  'invites',
  'workspaces',
  'viewer',
  'canManage',
] as const

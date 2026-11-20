/**
 * The words of the Agents tab of the org settings, which `OrgAgents.tsx`
 * draws. This module imports nothing, so the app can import the same
 * words, as it does for `endpointReadCopy.ts`.
 */
export const orgAgentsCopy = {
  description: (org: string) =>
    `Members of ${org} use these logins when they have none of their own.`,
  /** The sentence after the description, for a member who is not an admin. */
  memberNote: ' Only an admin can change them.',
  notConnected: 'Not connected',
  everyMember: {
    label: 'Use for every member',
    on: 'Every new session uses it, also for members with a login of their own.',
    off: 'Members without a login of their own use it.',
  },
} as const

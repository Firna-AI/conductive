/**
 * The limits of the plans and of each person. The free plan has the limits
 * that the user set on 5 November 2026. The start limits of each person
 * follow decision 23, and the running limit and the hourly start limit
 * follow decision 34, drawn as its recommended option D.
 */

/** What a free org includes. Archived workspaces do not count. */
export const freePlan = {
  orgs: 1,
  workspaces: 3,
  minutes: 600,
  members: 1,
} as const

/** The starts of each person in a day, such as 20. */
export const startsPerDay = 20

/** The cloud computers that each member of a paid org runs at once. */
export const runningPerMember = 5

/** When the limits of the states come back. */
export const resets = {
  /** The free minutes renew on the first day of each month. */
  minutes: '1 December',
  day: 'midnight UTC',
  hour: '15:00',
} as const

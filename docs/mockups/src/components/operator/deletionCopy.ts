/**
 * The words of the account deletion requests in the operator section: the
 * Deletions tab, and the notice on the page of a user who asked. Only the
 * mockups draw them so far. The section offers no action on a request,
 * because the plan has not decided how an operator completes one.
 */
export const deletionCopy = {
  tab: 'Deletions',
  title: 'Deletion requests',
  /** The line under the title, which counts the requests. */
  summary: (count: number) =>
    `${count} ${count === 1 ? 'request' : 'requests'}, oldest first.`,
  user: 'User',
  /** The column of the day of each request. */
  requested: 'Requested',
  empty: {
    title: 'No deletion requests',
    body: 'A request shows here when a person asks for the deletion of their account.',
  },
  /** The notice at the top of the page of a user who asked. */
  notice: (day: string) => `Deletion requested on ${day}`,
} as const

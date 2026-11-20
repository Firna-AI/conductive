import type { IssuePriority, IssueStatus } from '../../fixtures/issues'

/** The word of each issue state, as the list and the board show it. */
export const statusLabels: Readonly<Record<IssueStatus, string>> = {
  backlog: 'Backlog',
  todo: 'Todo',
  'in-progress': 'In progress',
  'in-review': 'In review',
  done: 'Done',
}

/** The word of each priority. */
export const priorityLabels: Readonly<Record<IssuePriority, string>> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No priority',
}

/** What an issue is, in the words of the Issues page. */
export const issueWords =
  'An issue holds a task until someone starts a workspace for it. Its workspaces move it on: In progress, In review, then Done at the merge.'

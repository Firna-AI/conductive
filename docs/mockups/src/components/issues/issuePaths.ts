/**
 * The catalogue paths of the issue explorations. Each variation has its
 * own folder under `app/issues`, and its screens link to each other.
 */
export const issuePaths = {
  overview: 'app/issues',
  // A: an Issues page beside the workspace list.
  pageList: 'app/issues/page',
  pageNew: 'app/issues/page/new',
  pageIssue: 'app/issues/page/issue',
  pageStart: 'app/issues/page/start',
  pageWorkspace: 'app/issues/page/workspace',
  pageLinked: 'app/issues/page/linked',
  // B: issues and workspaces in one list.
  listIssue: 'app/issues/one-list',
  listNew: 'app/issues/one-list/new',
  listWorkspace: 'app/issues/one-list/workspace',
  listBrief: 'app/issues/one-list/brief',
  // C: an issue holds its workspaces as a tree.
  parentHub: 'app/issues/parent',
  parentStart: 'app/issues/parent/start',
  parentAttempts: 'app/issues/parent/attempts',
  parentWorkspace: 'app/issues/parent/workspace',
  // D: a board, and the issue in the right column of its workspace.
  boardView: 'app/issues/board',
  boardDrop: 'app/issues/board/drop',
  boardWorkspace: 'app/issues/board/workspace',
  boardLive: 'app/issues/board/live',
} as const

/** The variation of the explorations that a shared part draws. */
export type IssueVariation = 'page' | 'one-list' | 'parent' | 'board'

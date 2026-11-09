/**
 * The workspaces of routine runs. A run workspace is a normal workspace in
 * the section of its routine (decision 204), on a new branch of the owner.
 * Its first message is the prompt, a separator line, and the facts of the
 * trigger. The message copies no title or body of a pull request.
 */

import { defaultChoice } from './agents'
import type { ChatItem } from './conversations'
import { changedFiles } from './files'
import { people } from './members'
import { pullRequest } from './pullRequests'
import { repositories } from './repositories'
import { routines, type Routine } from './routines'
import type { StartingLog } from './starting'
import { checkoutAutocomplete, type Workspace } from './workspaces'

/** The routine of a run, and the pull request of a pull request run. */
type RunOrigin = {
  routine: string
  pullRequest?: { number: number; url: string }
}

export type RunWorkspace = {
  workspace: Workspace
  origin: RunOrigin
  /** The first message, which waits while the sandbox starts. */
  queued: readonly ChatItem[]
  /** The first message and the first turn of the agent. */
  firstTurn: readonly ChatItem[]
  /**
   * The branch starts at the head commit of the pull request (decision
   * 205). Changes compares with the default branch, so it lists the work
   * of the pull request.
   */
  fromPullRequest: boolean
  starting: StartingLog
}

/** The run workspaces that the workspace screen can show. */
export const runWorkspaceKeys = ['pull-request', 'run-now'] as const

export type RunWorkspaceKey = (typeof runWorkspaceKeys)[number]

/** The line between the prompt and the facts of the trigger. */
const separator = '---'

/** The first message of a run: the prompt, a separator, and the facts. */
function runMessage(routine: Routine, facts: readonly string[]): string {
  return [
    routine.prompt,
    '',
    separator,
    `Routine: ${routine.name}`,
    ...facts,
  ].join('\n')
}

/** The lines that the changes of the pull request add, or remove. */
function changedLines(kind: 'added' | 'removed'): number {
  return changedFiles.reduce((sum, file) => sum + file[kind], 0)
}

const pullRequestStat = `+${changedLines('added')} −${changedLines('removed')}`

/** The head commit of pull request #482 when it opened. */
const headCommit = '9c41d7a2f0e85b13c6d4a7e9f2b0c5d8e1a3f604'

const review = routines['review-prs']
const summary = routines['morning-summary']
const storefront = repositories.storefront

const reviewMessage = runMessage(review, [
  'Trigger: PR opened',
  `Pull request: #${pullRequest.number}, ${pullRequest.url}`,
  `Head: ${checkoutAutocomplete.branch} at ${headCommit}`,
  `Base: ${storefront.defaultBranch}`,
])

const summaryMessage = runMessage(summary, ['Trigger: Run now'])

function cloudStart(fetch: string, branch: string): StartingLog {
  return {
    title: 'Starting the sandbox',
    steps: [
      'Starting from the cloud computer of Acme',
      fetch,
      `Creating branch ${branch}`,
    ],
    elapsed: '7s',
  }
}

const reviewRun: Workspace = {
  key: 'review-482',
  name: 'Review address autocomplete',
  generatedName: 'Porto',
  branch: `${people.cal.login}/porto-3f8m`,
  repository: 'storefront',
  section: review.section,
  choice: review.choice,
  status: 'working',
  updated: 'now',
  owner: 'cal',
}

const summaryRun: Workspace = {
  key: 'morning-summary-run',
  name: 'Merged pull requests',
  generatedName: 'Braga',
  branch: `${people.cal.login}/braga-9d2k`,
  repository: 'storefront',
  section: summary.section,
  choice: defaultChoice,
  status: 'working',
  updated: 'now',
  owner: 'cal',
}

export const runWorkspaces: Readonly<Record<RunWorkspaceKey, RunWorkspace>> = {
  'pull-request': {
    workspace: reviewRun,
    origin: {
      routine: review.name,
      pullRequest: { number: pullRequest.number, url: pullRequest.url },
    },
    queued: [{ kind: 'user', id: 'run', text: reviewMessage, queued: true }],
    firstTurn: [
      { kind: 'user', id: 'run', text: reviewMessage },
      {
        kind: 'agent',
        id: 'plan',
        paragraphs: [
          `I'll read the changes of pull request #${pullRequest.number} first.`,
        ],
      },
      {
        kind: 'tool',
        id: 'diff',
        tool: 'run',
        target: 'git diff --stat main...HEAD',
        detail: pullRequestStat,
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'read-form',
        tool: 'read',
        target: 'src/app/checkout/AddressForm.tsx',
        status: 'running',
      },
      { kind: 'working', id: 'working', elapsed: '48s' },
    ],
    fromPullRequest: true,
    starting: cloudStart(
      `Fetching pull request #${pullRequest.number} of ${storefront.name}`,
      reviewRun.branch,
    ),
  },
  'run-now': {
    workspace: summaryRun,
    origin: { routine: summary.name },
    queued: [{ kind: 'user', id: 'run', text: summaryMessage, queued: true }],
    firstTurn: [
      { kind: 'user', id: 'run', text: summaryMessage },
      {
        kind: 'agent',
        id: 'plan',
        paragraphs: [
          "I'll list the pull requests merged into main since Friday.",
        ],
      },
      {
        kind: 'tool',
        id: 'list',
        tool: 'run',
        target: 'git log --merges --since=2026-11-06 --oneline origin/main',
        status: 'running',
      },
      { kind: 'working', id: 'working', elapsed: '12s' },
    ],
    fromPullRequest: false,
    starting: cloudStart(
      `Fetching ${storefront.defaultBranch} of ${storefront.name}`,
      summaryRun.branch,
    ),
  },
}

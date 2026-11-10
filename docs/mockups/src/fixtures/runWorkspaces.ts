/**
 * The workspaces of routine runs that the workspace screen can show. The
 * base branch of a pull request run is the head branch of its pull
 * request, so its Changes list and its pull request bar show only its own
 * work (decision 507 G).
 */

import { defaultChoice } from './agents'
import { startFailedRun, turnFailedRun } from './failedRunWorkspaces'
import { changedFiles } from './files'
import { people } from './members'
import { pullRequest } from './pullRequests'
import { repositories } from './repositories'
import { routines } from './routines'
import {
  cloudStart,
  pullRequestFacts,
  runMessage,
  type RunWorkspace,
} from './runWorkspaceParts'
import {
  checkoutAutocomplete,
  workspaceLink,
  type Workspace,
} from './workspaces'

/**
 * The run workspaces that the workspace screen can show: a pull request
 * run, the run of Run now, and two failed runs that kept their workspaces.
 */
export const runWorkspaceKeys = [
  'pull-request',
  'run-now',
  'start-failed',
  'turn-failed',
] as const

export type RunWorkspaceKey = (typeof runWorkspaceKeys)[number]

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

const reviewMessage = runMessage(
  review,
  pullRequestFacts({
    trigger: 'PR opened',
    pullRequest,
    head: checkoutAutocomplete.branch,
    headCommit,
    mergesInto: storefront.defaultBranch,
  }),
)

const summaryMessage = runMessage(summary, ['Trigger: Run now'])

const reviewRun: Workspace = {
  key: 'review-482',
  name: 'Review address autocomplete',
  number: 403,
  link: workspaceLink('cm0YjhrB-DTIEJp6mtDjfkR-lAm76zVuKQRMXFPtTzg'),
  branch: `${people.cal.login}/porto-3f8m`,
  repository: 'storefront',
  section: review.section,
  choice: review.choice,
  status: 'working',
  updated: 'now',
  owner: 'cal',
  baseBranch: checkoutAutocomplete.branch,
}

const summaryRun: Workspace = {
  key: 'morning-summary-run',
  name: 'Merged pull requests',
  number: 404,
  link: workspaceLink('yJkjoAhmqwUVB6vlWGqk-enPknXxeegP22XbMDhe6vc'),
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
        blocks: [
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
        blocks: ["I'll list the pull requests merged into main since Friday."],
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
    starting: cloudStart(
      `Fetching ${storefront.defaultBranch} of ${storefront.name}`,
      summaryRun.branch,
    ),
  },
  'start-failed': startFailedRun,
  'turn-failed': turnFailedRun,
}

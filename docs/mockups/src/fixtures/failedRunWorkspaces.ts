/**
 * The workspaces of the two failed runs of the routine that reviews pull
 * requests, which kept their workspaces (decisions 130 D and 512 B): the
 * run of PR opened #486, whose first start failed, and the run of PR
 * pushed #486, whose first turn failed. Pull request #486 is Priya's. The
 * base branch of each run is its head branch (decision 507 G).
 */

import { people } from './members'
import { repositories } from './repositories'
import { routines } from './routines'
import { turnError } from './routineRuns'
import {
  cloudStart,
  pullRequestFacts,
  runMessage,
  type RunWorkspace,
} from './runWorkspaceParts'
import { workspaceLink, type Workspace } from './workspaces'

const review = routines['review-prs']
const storefront = repositories.storefront

/** Pull request #486 of Priya, which both failed runs review. */
const orderHistory = {
  number: 486,
  url: `https://github.com/${storefront.name}/pull/486`,
}

const head = `${people.priya.login}/order-history`

const origin = { routine: review.name, pullRequest: orderHistory }

const fetch = `Fetching pull request #${orderHistory.number} of ${storefront.name}`

/** The first message of the run of each event, with its head commit. */
function messageOf(trigger: string, headCommit: string): string {
  return runMessage(
    review,
    pullRequestFacts({
      trigger,
      pullRequest: orderHistory,
      head,
      headCommit,
      mergesInto: storefront.defaultBranch,
    }),
  )
}

const openedMessage = messageOf(
  'PR opened',
  'cb4d05a24853afbd3278aa1372e1c655c9fc1378',
)

const pushedMessage = messageOf(
  'PR pushed',
  '9b4e10a023287c0106cd5fbddf76d6195e0f954f',
)

/** The run of PR opened #486. Its first start failed 4 hours ago. */
const startFailedWorkspace: Workspace = {
  key: 'review-486-opened',
  name: 'Review order history',
  number: 405,
  link: workspaceLink('2WO_iMkpsSrzrWWY_BMmsdVHW9iBolctW1W-G3ZFNz4'),
  branch: `${people.cal.login}/faro-2h7c`,
  repository: 'storefront',
  section: review.section,
  choice: review.choice,
  status: 'error',
  github: null,
  updated: '4h',
  owner: 'cal',
  baseBranch: head,
}

/** The run of PR pushed #486. Its first turn failed 3 hours ago. */
const turnFailedWorkspace: Workspace = {
  key: 'review-486-pushed',
  name: 'Review order history changes',
  number: 406,
  link: workspaceLink('qw4NcEQQd1WlCPp0ukR271g_VztlRgkN-Fq_aU6mRLg'),
  branch: `${people.cal.login}/evora-6m1x`,
  repository: 'storefront',
  section: review.section,
  choice: review.choice,
  status: 'ready',
  github: null,
  updated: '3h',
  owner: 'cal',
  baseBranch: head,
}

/**
 * The run whose first start failed. Its first message waits in the queue
 * until Try again starts a sandbox, and its first turn then works on it.
 */
export const startFailedRun: RunWorkspace = {
  workspace: startFailedWorkspace,
  origin,
  queued: [{ kind: 'user', id: 'run', text: openedMessage, queued: true }],
  firstTurn: [
    { kind: 'user', id: 'run', text: openedMessage },
    {
      kind: 'agent',
      id: 'plan',
      blocks: ["I'll read the changes of pull request #486 first."],
    },
    { kind: 'working', id: 'working', elapsed: '9s' },
  ],
  starting: cloudStart(fetch, startFailedWorkspace.branch),
}

/**
 * The run whose first turn failed with an error of the model provider.
 * Try again retries the turn.
 */
export const turnFailedRun: RunWorkspace = {
  workspace: turnFailedWorkspace,
  origin,
  queued: [{ kind: 'user', id: 'run', text: pushedMessage, queued: true }],
  firstTurn: [
    { kind: 'user', id: 'run', text: pushedMessage },
    {
      kind: 'agent',
      id: 'plan',
      blocks: ["I'll read the new commits of pull request #486 first."],
    },
    {
      kind: 'tool',
      id: 'diff',
      tool: 'run',
      target: 'git diff --stat main...HEAD',
      detail: '+186 −24',
      status: 'done',
    },
    { kind: 'error', id: 'error', text: turnError },
  ],
  starting: cloudStart(fetch, turnFailedWorkspace.branch),
}

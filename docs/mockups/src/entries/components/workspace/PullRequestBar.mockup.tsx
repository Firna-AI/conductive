import { defineComponent } from '@mokly/mokly'
import {
  PullRequestBar,
  PullRequestRow,
} from '../../../components/workspace/PullRequestBar'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { workspaceSchema } from '../workspaces/workspaceSchemas'
import { barModelSchema } from './barSchemas'

/** A pull request that is ready to merge, with Squash and merge. */
const readyBar = {
  banner: 'ready-to-merge',
  actions: [{ kind: 'merge', method: 'squash', busy: false }],
  link: 'open',
  localWork: false,
} as const

/** A branch without a pull request, with Create PR. */
const noPullRequest = {
  banner: 'none',
  actions: [{ kind: 'agent', action: 'create-pull-request' }],
  localWork: false,
} as const

/** Place 3 of 3 of the merge queue, on #479, with Remove from queue. */
const queuedLine = {
  kind: 'entry',
  place: 3,
  size: 3,
  below: 479,
  step: 'waiting',
  remove: true,
} as const

/** A queued pull request whose checks run. */
const queuedBar = {
  banner: 'checks-running',
  actions: [],
  link: 'open',
  localWork: false,
  queue: { add: false, line: queuedLine },
} as const

/** The pull request bar at the top of the right column, registered with Mokly. */
export const pullRequestBar = defineComponent({
  slug: 'pull-request-bar',
  title: 'Pull request bar',
  description:
    'The pull request of the workspace branch at the top of the right column: its number, which opens it on GitHub, its checks and merge state in the tone of the state, and its main action. A branch without a pull request shows its target and Create pull request. A message, such as a refusal of GitHub, shows under the bar. Its own page shows a pull request that is ready to merge.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['bar', 'workspace'],
    properties: { bar: barModelSchema, workspace: workspaceSchema },
  } as const,
  props: { bar: readyBar, workspace: checkoutAutocomplete },
  render: (props) => (
    <PullRequestBar bar={props.bar} workspace={props.workspace} />
  ),
  variants: [
    {
      slug: 'no-pull-request',
      title: 'No pull request',
      description: 'The branch and its target, with Create PR.',
      props: { bar: noPullRequest },
    },
    {
      slug: 'checks-running',
      title: 'Checks running',
      description:
        'The spinner and the count of the checks, without an action.',
      props: {
        bar: {
          banner: 'checks-running',
          actions: [],
          link: 'open',
          localWork: false,
        },
      },
    },
    {
      slug: 'refused',
      title: 'Merge refused',
      description: 'The refusal of GitHub under the bar.',
      props: { bar: { ...readyBar, message: 'merge-refused' } },
    },
    {
      slug: 'queued',
      title: 'Queued',
      description:
        'A queued pull request: the line of the merge queue under the bar names its place and the pull request below it, with Remove from queue.',
      props: { bar: queuedBar },
    },
  ],
})

/** The compact pull request row of a phone, registered with Mokly. */
export const pullRequestRow = defineComponent({
  slug: 'pull-request-row',
  title: 'Pull request row',
  description:
    'The compact pull request row at the top of a workspace on a phone: the number and the state, in the tone of the state. It opens the Checks tab, whose top holds the actions of the bar. A branch without a pull request and without an action is not a link. Its own page shows a pull request that is ready to merge.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['bar'],
    properties: { bar: barModelSchema },
  } as const,
  props: { bar: readyBar },
  render: (props) => <PullRequestRow bar={props.bar} />,
  variants: [
    {
      slug: 'create',
      title: 'Create PR',
      description: 'A branch without a pull request: a link to Create PR.',
      props: { bar: noPullRequest },
    },
    {
      slug: 'no-commits',
      title: 'No commits',
      description: 'A branch without commits and without an action.',
      props: { bar: { banner: 'no-commits', actions: [], localWork: false } },
    },
    {
      slug: 'queued',
      title: 'Queued',
      description: 'A queued pull request names its place in the queue.',
      props: { bar: queuedBar },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import { QueueLineView } from '../../../components/workspace/QueueBarParts'
import { pullRequest } from '../../../fixtures/pullRequests'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { githubSchema, workspaceSchema } from '../workspaces/workspaceSchemas'
import { queueLineSchema } from './barSchemas'

/** Place 3 of 3, on #479, for a member who may change the queue. */
const upper = {
  kind: 'entry',
  place: 3,
  size: 3,
  below: 479,
  step: 'waiting',
  remove: true,
} as const

/**
 * The line of a queued workspace under the pull request bar, registered
 * with Mokly. Its pages show a layer that waits for its checks, a layer
 * that rebases, a layer whose checks failed, a merge that GitHub refused,
 * and the line of a member without write access.
 */
export const queueLine = defineComponent({
  slug: 'queue-line',
  title: 'Queue line',
  description:
    'The line of a queued workspace under the pull request bar, and at the top of the Checks tab of a phone: its place, then what its step does, what the queue waits for, or the pull request below it. An entry that cannot merge keeps the same line, with no tint, and a merge that GitHub refused leads to the pull request on GitHub. Remove from queue ends the line for a member with write access. Its own page shows place 3 of 3, on #479.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['line', 'workspace', 'github'],
    properties: {
      line: queueLineSchema,
      workspace: workspaceSchema,
      /** The GitHub state of the pull request, which names a fix. */
      github: githubSchema,
    },
  } as const,
  props: {
    line: upper,
    workspace: checkoutAutocomplete,
    github: 'checks-running',
  },
  render: (props) => (
    <QueueLineView
      github={props.github}
      line={props.line}
      workspace={props.workspace}
    />
  ),
  variants: [
    {
      slug: 'rebasing',
      title: 'Rebasing',
      description:
        'The layer moves onto the newest head of #479, so a spinner takes the place of the icon.',
      props: { line: { ...upper, step: 'rebasing' } },
    },
    {
      slug: 'checks-failed',
      title: 'Checks failed',
      description:
        'The checks of the pull request failed. The entry keeps its place, and the line says that the queue waits for its checks.',
      props: { github: 'checks-failed' },
    },
    {
      slug: 'merge-refused',
      title: 'Merge refused',
      description: `GitHub refused the merge, so the line leads to #${pullRequest.number} on GitHub, where GitHub names the reason.`,
      props: {
        line: { ...upper, step: 'ready', problem: 'merge-refused' },
        github: 'ready-to-merge',
      },
    },
    {
      slug: 'read-access',
      title: 'Read access',
      description:
        'A member without write access sees the place, and no Remove from queue.',
      props: { line: { ...upper, remove: false } },
    },
  ],
})

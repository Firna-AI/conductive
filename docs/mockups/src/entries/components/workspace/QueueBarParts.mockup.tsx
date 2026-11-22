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
 * that rebases, an entry that needs attention, a merge that GitHub
 * refused, and the line of a member without write access.
 */
export const queueLine = defineComponent({
  slug: 'queue-line',
  title: 'Queue line',
  description:
    'The line of a queued workspace under the pull request bar, and at the top of the Checks tab of a phone: its place and the pull request below it, with what its step does, or why it needs attention. An entry that needs attention tints the whole line amber, and a refused merge leads to the pull request on GitHub. Remove from queue ends the line for a member with write access. Its own page shows place 3 of 3, on #479.',
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
      slug: 'attention',
      title: 'Needs attention',
      description:
        'The checks still fail after the one fix turn, so the entry left the stack. The line is amber.',
      props: {
        line: { kind: 'attention', reason: 'checks-still-fail', remove: true },
        github: 'checks-failed',
      },
    },
    {
      slug: 'merge-refused',
      title: 'Merge refused',
      description: `GitHub refused the merge, so the line leads to #${pullRequest.number} on GitHub, where GitHub names the reason.`,
      props: {
        line: { kind: 'attention', reason: 'merge-refused', remove: true },
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

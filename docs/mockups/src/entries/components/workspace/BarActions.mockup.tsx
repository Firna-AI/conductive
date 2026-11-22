import { defineComponent } from '@mokly/mokly'
import {
  BarButtons,
  BarMessage,
} from '../../../components/workspace/BarActions'
import { ChecksActions } from '../../../components/workspace/ChecksActions'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { workspaceSchema } from '../workspaces/workspaceSchemas'
import { barMessageKinds, barModelSchema } from './barSchemas'

/** A pull request that is ready to merge, with Squash and merge. */
const readyBar = {
  banner: 'ready-to-merge',
  actions: [{ kind: 'merge', method: 'squash', busy: false }],
  link: 'open',
  localWork: false,
} as const

/** A merged pull request: Continue, and Archive for the owner. */
const mergedBar = {
  banner: 'merged',
  actions: [
    { kind: 'continue', busy: false, waiting: false },
    { kind: 'archive', busy: false, disabled: false },
  ],
  link: 'open',
  localWork: false,
} as const

/** The buttons of the pull request bar, registered with Mokly. */
export const barButtons = defineComponent({
  slug: 'bar-buttons',
  title: 'Bar buttons',
  description:
    'The buttons of the pull request bar, the main action first. An agent action sends its fixed prompt, Merge merges as the viewer, Ready for review marks a draft ready as the viewer, Continue moves the workspace to a new branch, and Archive archives it at once. The main action takes the tint of the bar, and a bar without a tint shows the outline tone. On desktop, the tooltip of a button names the key of its command. Its own page shows Squash and merge.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['bar'],
    properties: { bar: barModelSchema },
  } as const,
  props: { bar: readyBar },
  render: (props) => <BarButtons bar={props.bar} />,
  variants: [
    {
      slug: 'create',
      title: 'Create PR',
      description:
        'The agent action of a branch without a pull request, in the outline tone.',
      props: {
        bar: {
          banner: 'none',
          actions: [{ kind: 'agent', action: 'create-pull-request' }],
          localWork: false,
        },
      },
    },
    {
      slug: 'merging',
      title: 'Merging',
      description: 'The merge that runs: a spinner, and a press does nothing.',
      props: {
        bar: {
          ...readyBar,
          actions: [{ kind: 'merge', method: 'squash', busy: true }],
        },
      },
    },
    {
      slug: 'after-merge',
      title: 'After the merge',
      description: 'Continue in the merged tint, and Archive in the outline.',
      props: { bar: mergedBar },
    },
    {
      slug: 'ready-for-review',
      title: 'Ready for review',
      description:
        'The main action of a draft pull request, which marks it ready for review as the viewer.',
      props: {
        bar: {
          banner: 'draft',
          actions: [{ kind: 'ready', busy: false }],
          link: 'open',
          localWork: false,
        },
      },
    },
  ],
})

/** A message under the pull request bar, registered with Mokly. */
export const barMessage = defineComponent({
  slug: 'bar-message',
  title: 'Bar message',
  description:
    'A message under the pull request bar, such as a refusal of GitHub. It tints its whole line, and its edges stay neutral. Another refusal of GitHub, of a merge or of Ready for review, leads to the pull request on GitHub, where GitHub names the reason. Its own page shows a merge that GitHub refused.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'workspace'],
    properties: {
      kind: { enum: barMessageKinds },
      workspace: workspaceSchema,
    },
  } as const,
  props: { kind: 'merge-refused', workspace: checkoutAutocomplete },
  render: (props) => (
    <BarMessage kind={props.kind} workspace={props.workspace} />
  ),
  variants: [
    {
      slug: 'moved-head',
      title: 'Branch moved',
      description: 'A merge that stopped because the branch moved on GitHub.',
      props: { kind: 'merge-moved-head' },
    },
    {
      slug: 'continue-waits',
      title: 'Continue waits',
      description: 'A status, not an alert: Continue waits for the turn.',
      props: { kind: 'continue-waits' },
    },
    {
      slug: 'ready-refused',
      title: 'Ready for review refused',
      description:
        'GitHub refused to mark the draft ready, so the line leads to the pull request on GitHub.',
      props: { kind: 'ready-refused' },
    },
  ],
})

/** The actions of the bar at the top of the Checks tab, registered with Mokly. */
export const checksActions = defineComponent({
  slug: 'checks-actions',
  title: 'Checks actions',
  description:
    'The actions of the pull request bar at the top of the Checks tab of a phone, with the message of the bar and its link to GitHub. The row above opens this tab, because a button cannot sit inside the link of the row. Its own page shows Squash and merge with Open on GitHub.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['bar', 'workspace'],
    properties: { bar: barModelSchema, workspace: workspaceSchema },
  } as const,
  props: { bar: readyBar, workspace: checkoutAutocomplete },
  render: (props) => (
    <ChecksActions bar={props.bar} workspace={props.workspace} />
  ),
  variants: [
    {
      slug: 'refused',
      title: 'Merge refused',
      description: 'The refusal of GitHub above the buttons.',
      props: { bar: { ...readyBar, message: 'merge-refused' } },
    },
    {
      slug: 'queued',
      title: 'Queued',
      description:
        'Place 3 of 3 of the merge queue, ready with the layers below it: the line of the queue above Merge with 2 ahead.',
      props: {
        bar: {
          ...readyBar,
          actions: [{ kind: 'merge', method: 'squash', busy: false, below: 2 }],
          queue: {
            add: false,
            line: {
              kind: 'entry',
              place: 3,
              size: 3,
              below: 479,
              step: 'ready',
              remove: true,
            },
          },
        },
      },
    },
  ],
})

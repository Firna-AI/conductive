import { defineComponent } from '@mokly/mokly'
import {
  SandboxBar,
  SandboxPanel,
} from '../../../components/workspace/SandboxNotice'
import { orgSuspendedReason } from '../../../../../../src/ui/components/orgs/suspension'
import { archivedNow } from '../../../fixtures/archive'
import { sandboxNoticeSchema, sandboxPanelSchema } from './sandboxSchemas'

/** The bar under the chat of a sandbox that is not running, registered with Mokly. */
export const sandboxBar = defineComponent({
  slug: 'sandbox-bar',
  title: 'Sandbox bar',
  description:
    'The bar under the chat while the sandbox is not running. It takes the place of the composer, except after a failed first start. A refused start shows the words of the refusal and no action, because the start stays refused until its cause changes. A start that failed shows the message that the app saved for it. An archived workspace offers Restore until the app deletes its cloud computer, and gives the day when it leaves the list. A removed workspace gives the day of its removal. Its own page shows a stopped sandbox with Resume.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: { state: sandboxNoticeSchema },
  } as const,
  props: { state: { problem: 'stopped' } },
  render: (props) => <SandboxBar {...props.state} />,
  variants: [
    {
      slug: 'error',
      title: "Couldn't start",
      description: 'A start that failed, in the danger tone, with Try again.',
      props: { state: { problem: 'error' } },
    },
    {
      slug: 'refused',
      title: 'Start refused',
      description: 'The words of a refused start, without an action.',
      props: { state: { problem: 'refused', reason: orgSuspendedReason } },
    },
    {
      slug: 'archived',
      title: 'Archived',
      description: 'An archived workspace with Restore until its last day.',
      props: {
        state: { problem: 'archived', restore: 'available', days: archivedNow },
      },
    },
  ],
})

/**
 * What a panel shows while the sandbox is not running, registered with
 * Mokly. A screen that draws a screen of another viewport passes `phone`.
 * Without it, a page of the panel draws the layout of its view.
 */
export const sandboxPanel = defineComponent({
  slug: 'sandbox-panel',
  title: 'Sandbox panel',
  description:
    'What the file lists, the tools, or a file tab show while the sandbox is not running: the notice of the bar, or the wait of a start. The desktop layout leaves the action and the words of a refusal to the bar beside it. A phone shows the bar only on the Chat tab, so its panels show them too. Its own page shows the files of a stopped sandbox.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state', 'place'],
    properties: {
      state: sandboxPanelSchema,
      /** The panel of a phone, with the action and the words of a refusal. */
      phone: { type: 'boolean' },
      /** The place of the panel. */
      place: { enum: ['file', 'files', 'tools', 'preview'] },
    },
  } as const,
  props: { state: { problem: 'stopped' }, place: 'files' },
  render: (props, context) => (
    <SandboxPanel
      phone={props.phone ?? context.viewport === 'mobile'}
      place={props.place}
      state={props.state}
    />
  ),
  variants: [
    {
      slug: 'starting',
      title: 'Starting',
      description: 'The wait of a start, with a spinner.',
      props: { state: { problem: 'starting' } },
    },
    {
      slug: 'refused',
      title: 'Start refused',
      description:
        'A refused start, with its words on a phone, in place of the tools.',
      props: {
        state: { problem: 'refused', reason: orgSuspendedReason },
        place: 'tools',
      },
    },
    {
      slug: 'archived',
      title: 'Archived',
      description:
        'The files of an archived workspace, with Restore on a phone.',
      props: {
        state: { problem: 'archived', restore: 'available', days: archivedNow },
      },
    },
  ],
})

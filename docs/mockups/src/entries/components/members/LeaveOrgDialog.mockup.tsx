import { defineComponent } from '@mokly/mokly'
import { LeaveOrgDialog } from '../../../components/members/LeaveOrgDialog'
import { memberViewer } from '../../../fixtures/members'
import { personKeys } from '../layout/railSchemas'
import { viewports } from '../common/viewports'

/**
 * The question before a person leaves a suspended org, drawn open,
 * registered with Mokly. A screen that draws a screen of another viewport
 * passes `viewport`. Without it, a page of the dialog draws the layout of
 * its own view.
 */
export const leaveOrgDialog = defineComponent({
  slug: 'leave-org-dialog',
  title: 'Leave org dialog',
  description:
    'The question before a person leaves a suspended org: they can no longer open the org or read its chats, and their workspaces stay in it. Leave org then opens Get started, because it was their last org. While the leave runs, the question stays open: a spinner leads Leave org, and Cancel is off. On a phone the dialog opens as a sheet. Its own page shows the leave of Priya.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['viewer', 'busy'],
    properties: {
      /** The person who leaves. */
      viewer: { enum: personKeys },
      /** The leave runs, so neither button takes a press. */
      busy: { type: 'boolean' },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { viewer: memberViewer, busy: false },
  render: (props, context) => (
    <LeaveOrgDialog
      busy={props.busy}
      viewer={props.viewer}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'leaving',
      title: 'Leaving',
      description:
        'The leave runs: a spinner leads Leave org, and Cancel is off.',
      props: { busy: true },
    },
  ],
})

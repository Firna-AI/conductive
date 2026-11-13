import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'The Capabilities icon sits beside the attach button at the bottom right of the dialog, and it shows its label on hover. A press opens the control above it, with the same parts as on the page: the secrets of Acme with FIGMA_TOKEN pre-approved, and Mac access on. The phone view is the New workspace page with the control as a sheet, because a phone always opens the page.',
  rationale:
    'Secrets decision 6 puts the same icon on the page and in the dialog, so a choice belongs to the draft wherever it opens. The control opens above the icon and covers the message while it is open, so the dialog keeps its size.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message', capabilities: 'open' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})

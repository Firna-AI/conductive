import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../../screens/NewWorkspaceDialogScreen'

export const branchMissingDialog = defineScreen({
  title: 'Missing branch in the dialog',
  description:
    'The create from the dialog was refused, because calummoore/checkout-autocomplete is no longer on GitHub. The control in the header still names the branch alone. The notice above the footer keeps the message and offers Start from main, as on the page. The dialog stays open. The phone view is the New workspace page in the same state, because a phone always opens the page.',
  rationale:
    'The dialog holds the parts of the page, so it shows the refusals of the page. This screen was a state of the dialog page. It moved here so that the dialog page can show five states of the branch control.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: {
    ...emptyDialog,
    draft: 'message',
    branch: 'picked',
    result: 'missing-branch',
  },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})

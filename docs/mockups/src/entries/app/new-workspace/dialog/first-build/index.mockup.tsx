import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogFirstBuild = defineScreen({
  title: 'First build',
  description:
    'Firna has no good image yet. The dialog keeps the written task and shows the first build above its footer, with Cloud computer settings for Cal, an admin. Create stays off until a build succeeds. The phone shows the same notice on the New workspace page.',
  rationale:
    'Moved here from a saved state of the dialog page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: {
    ...emptyDialog,
    draft: 'message',
    org: 'new',
    firstBuild: 'running',
  },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})

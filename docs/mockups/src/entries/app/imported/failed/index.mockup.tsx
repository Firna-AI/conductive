import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedFailed = defineScreen({
  title: 'Activation failed',
  description:
    'The activation failed. The notice names it with the message that the app saved, says that the work from Conductor is kept, and offers Try again, which activates again. The old sessions stay links, and the composer stays under the notice, as after a failed first start.',
  rationale:
    'A failed activation keeps the workspace, its old sessions, and its stored work, and it offers Try again, as the design of the import says. The mockups draw only a general failure.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...importedWorkspace, sandbox: 'error', tab: 'new-session' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'files',
      title: 'Files on a phone',
      description:
        'The Files tab of a phone after the failed activation. The panel says that the workspace could not be activated and that the work from Conductor is kept, with Try again. The Terminal and Preview tabs show the same panel.',
      props: { focus: 'files' },
    },
  ],
})

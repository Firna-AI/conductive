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
    'A failed activation keeps the workspace, its old sessions, and its stored work, and it offers Try again, as the design of the import says. The mockups draw a general failure and a package that does not fit the disk.',
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
    {
      slug: 'disk-space',
      title: 'Not enough disk',
      description:
        'Activation checked the disk first: the work from Conductor needs 41.3 MB of disk space to unpack, and the cloud computer has 23.6 MB free. So it stopped before it changed the checkout or sent any work. The notice names both sizes, says that the work from Conductor is kept, and offers Try again, as every failed activation does. The workspace and its sessions stay. No document or panel of this state is drawn, so the links to the old sessions and the tabs of a phone stay static.',
      rationale:
        'The user chose on 10 November 2026 that activation first checks the space that the package needs, with room to unpack it, against the free disk of the cloud computer, and that it stops with both sizes when the work does not fit. The notice offers no other action, because no larger disk or choice of files exists.',
      props: { startError: 'disk-space' },
    },
  ],
})

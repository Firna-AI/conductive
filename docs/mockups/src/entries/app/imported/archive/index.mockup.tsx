import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedArchive = defineScreen({
  title: 'Archive before activation',
  description:
    'Cal chose Archive on the row of Coupon totals at checkout, which was never activated. The question says that after Archive the workspace can no longer be activated, and that its sessions from Conductor stay in Archived, where Cal can read them. Cancel returns to the workspace, and Archive leads to the archived workspace. On a phone the question is a sheet.',
  rationale:
    'Archive of every other workspace asks no question, because Restore brings it back with its kept cloud computer for 14 days. This workspace has no cloud computer to keep, before its activation and after the failed activation that the variant draws, so it offers no Restore after Archive, and Archive checks nothing. The question therefore does not say that everything is pushed, or that Archive deletes a cloud computer. It names the one result that the user needs before the choice: the workspace can no longer be activated. The old sessions stay readable, because their files stay for the life of the workspace. The owner of the workspace and the admins of the org see Archive, as for every workspace.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...importedWorkspace, overlay: 'imported-archive' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'After a failed activation',
      description:
        'The activation failed, and Cal chose Archive. The workspace still has no cloud computer, so the same question shows. Cancel returns to the failed activation, and Archive leads to the same archived workspace, because it was never activated either.',
      props: { sandbox: 'error', tab: 'new-session' },
    },
  ],
})

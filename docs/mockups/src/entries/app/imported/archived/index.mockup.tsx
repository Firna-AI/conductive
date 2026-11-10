import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedArchived = defineScreen({
  title: 'Archived before activation',
  description:
    'Coupon totals at checkout after Archive, before it was ever activated. It left Import from Conductor for the open Archived group, and Check webhook signatures stays in that section. Its bar names the day of the archive and says that its sessions from Conductor stay readable. It names no deleted cloud computer, because the workspace never had one. The old sessions stay links, and nothing offers Activate or a new session. On a phone the archived workspace shows only its chat.',
  rationale:
    'Archive has no undo, keeps the documents of the old sessions readable for the life of the workspace, and makes a later activation impossible. A workspace that was never activated never had a usable cloud computer, so the bar of an archived workspace, which says that its cloud computer is deleted, does not fit. The right column keeps the pull request bar and says that the workspace has no files or tools.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...importedWorkspace, sandbox: 'archived-inactive' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'old-session',
      title: 'Old session',
      description:
        'The link Apply coupons before tax opened its file in the Markdown view of the archived workspace, in a tab on desktop and in the Chat tab of a phone, with a way back to the archived chat.',
      props: { tab: 'old-session' },
    },
  ],
})

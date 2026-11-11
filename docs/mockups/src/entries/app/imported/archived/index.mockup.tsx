import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedArchived = defineScreen({
  title: 'Archived before activation',
  description:
    'Coupon totals at checkout after Archive, before it was ever activated. It left Import from Conductor for the open Archived group, and Check webhook signatures stays in that section. Its bar names the day of the archive and says that its sessions from Conductor stay readable. It names no deleted cloud computer, because the workspace never had one. The old sessions stay links, and nothing offers Activate, Restore, or a new session. On a phone the archived workspace shows only its chat.',
  rationale:
    'Restore needs a kept cloud computer. This workspace was archived before any activation started, so it never had one, and this Archive has no undo. It keeps the documents of the old sessions readable for the life of the workspace, and makes a later activation impossible. The bars of an archived workspace, which offer Restore or say that its cloud computer is deleted, do not fit. The right column keeps the pull request bar and says that the workspace has no files or tools.',
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
    {
      slug: 'toast',
      title: 'Just archived',
      description:
        'Cal pressed Archive in the question. The workspace left Import from Conductor for the open Archived group at once, and a toast names it. The toast offers no Restore, because the app keeps no cloud computer of this workspace for Restore to bring back. Its bar and its links to the old sessions stay.',
      rationale:
        'The toast after Archive offers Restore only while the app keeps a cloud computer, because Restore needs that computer. A workspace from Conductor that never started has none, so its toast only names it. The question before the Archive already said that it cannot be activated while it is archived.',
      props: { toast: 'archived' },
    },
  ],
})

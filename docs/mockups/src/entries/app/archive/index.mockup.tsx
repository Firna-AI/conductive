import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const archive = defineScreen({
  title: 'Archive',
  description:
    'Archive from the header of a workspace whose turn the user stopped. The check found work that is not on GitHub: two changed files that are not committed, and a commit that is not pushed. The dialog lists them, and Archive anyway deletes them with the cloud computer. Cancel keeps the workspace, so the user can push first. On a phone the question is a sheet.',
  rationale:
    'The user chose option D of decision 16: Archive deletes the cloud computer and keeps the chat read-only in an Archived group, the pull request bar offers Archive after a merge, Archive first checks for work that is not committed or not pushed, and a workspace near day 14 of a stop shows as expiring. Only the owner of the workspace and the owners of the org see Archive, as the user chose in decision 42.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'interrupted',
    banner: 'none',
    overlay: 'archive-unpushed',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'pushed',
      title: 'Everything pushed',
      description:
        'Archive from the pull request bar after the merge. The check found nothing that is not pushed, so the question says so, and Archive goes ahead.',
      props: {
        conversation: 'history',
        banner: 'merged',
        overlay: 'archive-pushed',
      },
    },
    {
      slug: 'archived',
      title: 'Archived',
      description:
        'The workspace is archived: it left its section for the Archived group at the end of the list, its chat is read-only, and its file lists and tools went with the cloud computer, so a phone shows only the chat, and the right column of a desktop keeps only the pull request. Infra is open, where Move retries to a queue shows an hourglass, because its cloud computer is deleted tomorrow, 14 days after its stop.',
      props: {
        sandbox: 'archived',
        conversation: 'history',
        banner: 'merged',
        overlay: 'none',
      },
    },
  ],
})

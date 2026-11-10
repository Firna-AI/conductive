import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

const flow = ['user-flows/archive-from-list']

export const workspaceMenuArchive = defineScreen({
  title: 'Archive from the list',
  description:
    'Archive in the menu of Apple Pay button checks its cloud computer for work that is not on GitHub, then asks first, with the question of Archive: a changed file that is not committed, and two commits that are not pushed. Cancel leaves the workspace as it was. Archive anyway deletes the cloud computer and keeps the chat. The workspace does not open, and the list stays where it was. On a phone the question is a sheet.',
  rationale:
    'The menu reuses Archive with its check and its question, from decision 16, as app/archive shows. Only the owner and the admins see Archive, from decision 42. The question opens over the page that shows the list, so the menu archives a workspace without opening it, as Archive on its row does. For the open workspace, the menu opens the same question as the other ways to archive it, so one action asks one question.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace-archive', palette: 'closed' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'check-failed',
      title: 'Check did not finish',
      description:
        'Archive in the menu of Checkout address autocomplete, whose cloud computer is stopped. The stopped cloud computer refused the command that checks the work, so the question says that the check did not finish, with the message of the server. It offers no Archive. Try again runs the check again, and Cancel leaves the workspace as it was.',
      rationale:
        'Archive never deletes a cloud computer without its check. The app keeps the question of a failed check and the advice of the server, and it does not start the cloud computer by itself.',
      props: { menu: 'workspace-check-failed' },
    },
    {
      slug: 'archived',
      title: 'Archived from the list',
      description:
        'Archive anyway took Apple Pay button from Checkout to the Archived group at the end of the list. The group stays collapsed, with its count, because the workspace did not open. The list stays where it was.',
      props: { menu: 'workspace-archived' },
      useCasePaths: flow,
    },
  ],
})

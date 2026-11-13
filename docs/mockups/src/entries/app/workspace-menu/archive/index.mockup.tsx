import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

const flow = ['user-flows/archive-from-list']

export const workspaceMenuArchive = defineScreen({
  title: 'Archive from the list',
  description:
    'Archive in the menu of Apple Pay button archived it at once, with no check and no question. Its row left Checkout for the Archived group at the end of the list, which stays collapsed because the workspace did not open. Its count holds the three workspaces of the last 14 days. A toast names the workspace, gives the day when it leaves the list, and offers Restore. The list stays where it was. On a phone the toast spans the bottom of the screen.',
  rationale:
    'The menu runs the same Archive as the row and the pull request bar, from decision 1 of PR #138: it stops the cloud computer and keeps it for 14 days, so the toast can offer Restore. Only the owner and the admins see Archive, from decision 42. The workspace does not open, so Archive from the list starts no cloud computer. The menu keeps its four actions, and Restore stays on the row, the bar, the toast, and the palette.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace-archive', palette: 'closed' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'stopped',
      title: 'A stopped workspace',
      description:
        'Archive in the menu of Checkout address autocomplete, whose cloud computer is stopped, archives it at once too. Its row moves to the collapsed Archived group, and the toast offers Restore. Archive starts no cloud computer.',
      rationale:
        'Archive runs no check, so it needs no running cloud computer. A workspace that stopped after 30 idle minutes archives as any other.',
      props: { menu: 'workspace-archive-stopped' },
    },
    {
      slug: 'restored',
      title: 'Restored from the toast',
      description:
        'Restore in the toast put Apple Pay button back in Checkout, at its place, with its files and sessions. Archive stopped its cloud computer, so the row shows it stopped. The workspace does not open, and the list stays where it was. Opening the workspace resumes its cloud computer.',
      props: { menu: 'workspace-restored' },
      useCasePaths: flow,
    },
  ],
})

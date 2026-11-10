import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const importedList = defineScreen({
  title: 'List after the import',
  description:
    'The workspace list of Acme just after the import, when both uploads ended. The section Import from Conductor stands at the top, with Coupon totals at checkout and Check webhook signatures. Each one shows Not active, the four corners of its mark, until a member activates it. On a phone the list is the home screen.',
  rationale:
    'The user chose on 9 November 2026 one section, Import from Conductor, for every imported workspace, because the Mac has no sections of Conductor. The import creates the section with its first complete workspace when the org has none, and the section stands at the top, so each new workspace shows as soon as its own upload ends. It is a section like the others, so its workspaces can move by drag and drop.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'imported', menu: 'none', palette: 'closed' },
  useCasePaths: ['user-flows/import-from-conductor'],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'archive',
      title: 'Archive from the list',
      description:
        'Cal chose Archive on the row of Coupon totals at checkout in the list, with no workspace open. The question of Archive before the activation shows over the list. Cancel keeps the list, and Archive leads to the list just after that Archive. On a phone the question is a sheet over the home list.',
      props: { list: 'imported-archive' },
    },
    {
      slug: 'archived',
      title: 'Just archived from the list',
      description:
        'The list just after that Archive. Coupon totals at checkout sits in the open Archived group, and its row opens the archived workspace. Check webhook signatures stays in Import from Conductor. The toast names the workspace and offers no Restore, because the app keeps no cloud computer of this workspace for Restore to bring back.',
      props: { list: 'imported-archived' },
    },
  ],
})

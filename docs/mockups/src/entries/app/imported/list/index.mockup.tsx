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
})

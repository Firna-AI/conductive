import { defineScreen } from '@mokly/mokly'
import { OneListIssueScreen } from '../../../../screens/issues/OneListScreens'

export const issuesOneList = defineScreen({
  title: 'B. One list',
  description:
    'Variation B. Issues and workspaces share the sections of the sidebar. An issue that waits for a start shows its state circle in the column of the list marks, with its title in muted ink. The postcode issue is open: its description, checklist, and activity, and a message box with Start in place of Send. A note in the box goes to the agent with the issue.',
  rationale:
    'An issue is a workspace that has not started. The person sorts issues into sections as workspaces, and reads all open work in one list. The circle has no grid of cells, so an issue never reads as a cloud computer that runs.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-one-list'],
  render: (_props, context) => (
    <OneListIssueScreen viewport={context.viewport} />
  ),
})

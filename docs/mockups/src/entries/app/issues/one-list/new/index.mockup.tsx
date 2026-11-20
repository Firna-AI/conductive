import { defineScreen } from '@mokly/mokly'
import { OneListIssueScreen } from '../../../../../screens/issues/OneListScreens'

export const issuesOneListNew = defineScreen({
  title: 'B. Save as issue',
  description:
    'New workspace gets Save as issue beside Start. The person writes the task as today. Save as issue keeps it in the section as an issue, with no cloud computer. Start makes the workspace at once. The state, the priority, and the assignee sit in the footer.',
  rationale:
    'One form makes both. A task that is not ready to run waits in the list as an issue, and a later Start uses the same words.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-one-list'],
  render: (_props, context) => (
    <OneListIssueScreen viewport={context.viewport} dialog />
  ),
})

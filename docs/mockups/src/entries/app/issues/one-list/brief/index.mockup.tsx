import { defineScreen } from '@mokly/mokly'
import { OneListWorkspaceScreen } from '../../../../../screens/issues/OneListScreens'

export const issuesOneListBrief = defineScreen({
  title: 'B. The issue tab',
  description:
    'The issue tab of the workspace: the description, the checklist, and the activity of the issue. The agent ticked the first item of the checklist, and its activity says so. The issue is now In progress.',
  rationale:
    'The agent and the person read and change the same brief. A tick of the agent shows where the work is, without a read of the whole chat.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-one-list'],
  render: (_props, context) => (
    <OneListWorkspaceScreen viewport={context.viewport} tab="issue" />
  ),
})

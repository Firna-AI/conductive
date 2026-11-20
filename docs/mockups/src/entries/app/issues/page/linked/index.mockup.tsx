import { defineScreen } from '@mokly/mokly'
import { IssuePageScreen } from '../../../../../screens/issues/PageScreens'

export const issuesPageLinked = defineScreen({
  title: 'A. The issue after the start',
  description:
    'The issue after Start: In progress, with W-403 in its Workspaces block. The row shows the live mark of the workspace, its agent, its state, and its owner, and it opens the workspace. Add workspace starts one more workspace for the same issue. The activity says who started the workspace and why the state changed.',
  rationale:
    'An issue can hold more than one workspace, such as a fix and a later follow-up. The state of the issue follows its workspaces, so nobody moves it by hand.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-page-start'],
  render: (_props, context) => (
    <IssuePageScreen viewport={context.viewport} started />
  ),
})

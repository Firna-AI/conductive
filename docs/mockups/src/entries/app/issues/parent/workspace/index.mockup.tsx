import { defineScreen } from '@mokly/mokly'
import { ParentWorkspaceScreen } from '../../../../../screens/issues/ParentScreens'

export const issuesParentWorkspace = defineScreen({
  title: 'C. An attempt',
  description:
    'The Codex attempt, open. Its row is selected under the issue in the sidebar. The line under the header names the issue, its state, and its count of workspaces, and opens the issue.',
  rationale:
    'An attempt is a normal workspace. Its place in the tree and the line under the header both lead back to the issue.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-attempts'],
  render: (_props, context) => (
    <ParentWorkspaceScreen viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import { ParentHubScreen } from '../../../../../screens/issues/ParentScreens'

export const issuesParentStart = defineScreen({
  title: 'C. Ways to start',
  description:
    'The menu of Start: one workspace with Claude, two attempts with Claude and Codex, or a plan that the agent splits into sub-workspaces. Two attempts is under the pointer. The note says that each attempt has its own cloud computer, branch, and pull request.',
  rationale:
    'An issue is a good unit for a comparison, because both attempts get the same brief. The menu keeps one workspace as the first choice, so the simple start stays one press away.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-attempts'],
  render: (_props, context) => (
    <ParentHubScreen viewport={context.viewport} stage="menu" />
  ),
})

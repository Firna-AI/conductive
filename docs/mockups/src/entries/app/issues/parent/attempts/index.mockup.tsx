import { defineScreen } from '@mokly/mokly'
import { ParentHubScreen } from '../../../../../screens/issues/ParentScreens'

export const issuesParentAttempts = defineScreen({
  title: 'C. Two attempts',
  description:
    'The issue twenty minutes after the start of two attempts. Its Attempts block lists both workspaces with their agents, their changes, and the state of their pull requests. The Claude attempt has a pull request that is ready to merge, so the issue moved to In review. The sidebar shows both attempts under the issue.',
  rationale:
    'The person compares the attempts on the issue, and opens the one to merge. The other attempt stays until the person archives it.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-attempts'],
  render: (_props, context) => (
    <ParentHubScreen viewport={context.viewport} stage="attempts" />
  ),
})

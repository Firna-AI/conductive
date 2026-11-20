import { defineScreen } from '@mokly/mokly'
import { ParentHubScreen } from '../../../../screens/issues/ParentScreens'

export const issuesParent = defineScreen({
  title: 'C. Issue as parent',
  description:
    'Variation C. Each issue with workspaces heads a tree of them in the sidebar, with the guide lines of sub-workspaces. Address autocomplete at checkout holds two workspaces. The Issues page holds the issues that wait for a start, as in variation A. The postcode issue is open, with Start and its menu of ways to start.',
  rationale:
    'Work that belongs together shows together. An issue can hold a fix and its follow-ups, or two attempts by different agents. The tree reuses the rows and the lines of sub-workspaces, so it reads as the list of today.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-attempts'],
  render: (_props, context) => (
    <ParentHubScreen viewport={context.viewport} stage="todo" />
  ),
})

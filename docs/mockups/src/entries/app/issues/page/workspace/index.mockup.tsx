import { defineScreen } from '@mokly/mokly'
import { PageWorkspaceScreen } from '../../../../../screens/issues/StartScreens'

export const issuesPageWorkspace = defineScreen({
  title: 'A. The workspace of an issue',
  description:
    'The workspace that Start made. It takes the title of the issue as its name, and joins Checkout, the section of the issue. A line under the header names the issue, its label, and its state, as the line of a run workspace names its automation. The line opens the issue. Everything else is the workspace of today.',
  rationale:
    'The workspace stays the place of the work. The issue is one line away, in the place that run workspaces already use for their source, so the header keeps its room.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-page-start'],
  render: (_props, context) => (
    <PageWorkspaceScreen viewport={context.viewport} />
  ),
})

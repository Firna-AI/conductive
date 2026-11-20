import { defineScreen } from '@mokly/mokly'
import { IssuePageScreen } from '../../../../../screens/issues/PageScreens'

export const issuesPageIssue = defineScreen({
  title: 'A. An issue',
  description:
    'The page of the postcode issue: its label, title, description, and checklist, its Workspaces block, and its activity, with its fields in a column at the side. It has no workspace yet, so the block offers Start workspace and says where the workspace starts. On a phone the fields stand under the title.',
  rationale:
    'The start lives on the issue, where the person reads the task. The block keeps one place for the workspaces before and after the start, so the page does not change its shape.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-page-start'],
  render: (_props, context) => (
    <IssuePageScreen viewport={context.viewport} started={false} />
  ),
})

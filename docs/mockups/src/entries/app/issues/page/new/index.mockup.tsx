import { defineScreen } from '@mokly/mokly'
import { IssuesPageScreen } from '../../../../../screens/issues/PageScreens'

export const issuesPageNew = defineScreen({
  title: 'A. New issue',
  description:
    'New issue opens a dialog over the Issues page, in the card of New workspace: the repository at the top, then the title, the description, the state, the priority, and the assignee. Create issue saves the issue and starts no cloud computer. Create and start also opens New workspace, filled in from the issue.',
  rationale:
    'The dialog shares the card of New workspace, so the two read as one family. The repository is a choice, because an issue can wait before anyone knows where its work goes.',
  relatedDocs: [],
  props: {},
  render: (_props, context) => (
    <IssuesPageScreen viewport={context.viewport} dialog />
  ),
})

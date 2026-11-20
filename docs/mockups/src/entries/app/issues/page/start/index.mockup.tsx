import { defineScreen } from '@mokly/mokly'
import { PageStartScreen } from '../../../../../screens/issues/StartScreens'

export const issuesPageStart = defineScreen({
  title: 'A. Start from the issue',
  description:
    'Start workspace opens New workspace over the issue, filled in: the repository and the section of the issue, and a first message with the label, the title, and the description of the issue. The note above the footer says that the workspace links to the issue, which moves to In progress. The person can change the message before Create. A phone opens the New workspace page.',
  rationale:
    'The start reuses New workspace, so there is one way to create a workspace. The issue fills the form, and the person keeps control of the first message, the model, and the Capabilities.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-page-start'],
  render: (_props, context) => <PageStartScreen viewport={context.viewport} />,
})

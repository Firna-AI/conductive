import { defineScreen } from '@mokly/mokly'
import { IssuesPageScreen } from '../../../../screens/issues/PageScreens'

export const issuesPage = defineScreen({
  title: 'A. Issues page',
  description:
    'Variation A. Issues is a page of the org, under New workspace in the sidebar, as Automations is. The issues group by state: In progress, In review, Todo, and Backlog, with Done collapsed. Each row shows its priority, its label, its state, its title, the live marks of its workspaces, its assignee, and its age. The postcode issue, I-31, has no workspace yet. The count beside Issues is the open issues of Cal that no workspace works on.',
  rationale:
    'An issue is a plain record of the org. It costs nothing until a start, because it has no cloud computer. The page reads like a tracker, and the workspace list stays as it is today. The live marks on a row show the work of the agents without a visit to each workspace.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-page-start'],
  render: (_props, context) => <IssuesPageScreen viewport={context.viewport} />,
})

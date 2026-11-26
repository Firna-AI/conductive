import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueSubWorkspaces = defineScreen({
  title: 'Queued sub-workspaces',
  description:
    'Cal queued Checkout address autocomplete, the top of the deepest tree, and Places API client, a sub-workspace in the middle of that tree. Each shows once, as a flat row of the group, with no indent, and the line of the group joins the two. Address search API and Suggestion list move up a level and become top-level rows of Checkout. Rate limits and Rate limits: Load test show under Address search API, the nearest row above them that is not queued, one step less indented than before. The tree of Apple Pay button keeps its shape.',
  rationale:
    'Cal chose option D of decision 318 on 22 November 2026: a queued workspace leaves its section and shows once, as a flat row in the group, in queue order. Its live sub-workspaces that are not queued show under the nearest workspace above them that is not queued, as for an archived parent (sub-workspace decision 5 C). The mockups place the rows with the rule of the app, `placeWorkspaces`, which reads a queued row as an archived one.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'trees',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'left',
      title: 'After the parent leaves',
      description:
        'Cal removed Checkout address autocomplete from the queue. It goes back to Checkout, and Address search API and Suggestion list show under it again. Places API client stays queued, now at place 1, alone in the group, so no line shows. Rate limits and Rate limits: Load test stay under Address search API.',
      rationale:
        'Decision 318 D: the sub-workspaces go back under their parent when it leaves the queue.',
      props: { mergeQueue: 'trees-left' },
    },
  ],
})

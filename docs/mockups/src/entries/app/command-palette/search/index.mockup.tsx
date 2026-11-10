import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteSearch = defineScreen({
  title: 'Search',
  description:
    'Cal types "check". Checkout address autocomplete is the first result, and Enter opens it. An archived workspace matches too, in its own group after the other results.',
  rationale:
    'A search looks at the name, the label of the number, the branch, and the repository of each workspace, and at the label and the search words of each action and setting. It ignores case, and each word of the query must match. Archived workspaces come last, so the active ones stay first. While the workspace data loads, or after its read failed, a spinner or a notice with Try again takes the place of the workspace groups, as the user chose in decision 164. So a search never gives a partial answer as a complete one. The states of the search are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'search' },
  useCasePaths: ['user-flows/open-workspace-from-palette'],
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../../screens/CommandPaletteScreen'

export const paletteSearchLoading = defineScreen({
  title: 'Repositories loading',
  description:
    'Cal types "new" while the palette still loads the repository names, which a search looks at. A spinner stands first, in place of the workspace groups. The actions and the setting that match show under it, and New workspace is highlighted.',
  rationale:
    'While the workspace data loads, a spinner takes the place of the workspace groups, as the user chose in decision 164. So a search never gives a partial answer as a complete one. Moved here from a saved state of the search page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'search-loading' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../../screens/CommandPaletteScreen'

export const paletteRepositoriesUnavailable = defineScreen({
  title: 'Repositories not loaded',
  description:
    'The workspace list of Acme is ready, but the repository names did not load, and Cal types "new". A search looks at those names, so the notice "The repositories didn\'t load" stands first, in place of the workspace groups. It has the message of the server and Try again, which reads the names again. The actions and the setting that match show under it. With an empty field, the All tab needs only the list, so the recent workspaces show without their repositories. A status part stands before Actions there only while the list loads or after it failed.',
  rationale:
    'After the read of the repository names failed, a notice with Try again takes the place of the workspace groups, as the user chose in decision 164. So a search never gives a partial answer as a complete one. Moved here from a saved state of the search page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'search-repositories-unavailable' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

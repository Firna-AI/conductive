import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../../screens/CommandPaletteScreen'

export const paletteSearchUnavailable = defineScreen({
  title: 'Workspaces not loaded',
  description:
    'The workspace list of Acme did not load, and Cal types "new". The notice "The workspaces didn\'t load" stands first, in place of the workspace groups, with the message of the server and Try again, which reads the list again. The actions and the setting that match show under it. On desktop, the list behind the palette shows the same failure. With an empty field, the same status part stands before Actions on the All tab, in place of Recent workspaces.',
  rationale:
    'After the read of the workspace data failed, a notice with Try again takes the place of the workspace groups, as the user chose in decision 164. So a search never gives a partial answer as a complete one. Moved here from a saved state of the search page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'search-unavailable' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

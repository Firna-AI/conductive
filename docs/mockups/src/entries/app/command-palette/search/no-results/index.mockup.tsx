import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../../screens/CommandPaletteScreen'

export const paletteNoResults = defineScreen({
  title: 'No results',
  description:
    'Nothing in Acme matches "refund". The palette says so, and names what a search looks at.',
  rationale:
    'Moved here from a saved state of the search page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'no-results' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

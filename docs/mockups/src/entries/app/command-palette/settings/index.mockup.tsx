import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteSettings = defineScreen({
  title: 'Settings tab',
  description:
    'The six tabs of the settings of Acme, then the sections of Account settings, which every org shares: Sign-in, GitHub, Agents, Favourites, New workspaces, and Keyboard shortcuts. Each row opens its page. Favourites and New workspaces open the Preferences tab, which holds them in this order. Repositories shows ⌥⌘A, and Keyboard shortcuts shows ⌥⌘/.',
  rationale:
    'Each setting also has search words that its row does not show, such as Claude and Codex for each Agents row, org login for the Agents tab of Acme, env for Cloud computer, favorites and model menu for Favourites, and model for New workspaces. The Account group follows the order of the Account page (decision 198), so the Favourites section of model favourites gets its row before New workspaces. A row that opens the model menu was not chosen, because the menu adds no favourite. The Mac app adds This Mac to the Account group. Keyboard shortcuts opens app/account/shortcuts, because the shortcuts follow the account in every browser (decision 190, 9 November 2026).',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'settings' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

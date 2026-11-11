import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteSettings = defineScreen({
  title: 'Settings tab',
  description:
    'The four tabs of the settings of Acme, then the sections of the Account page, which every org shares: Sign-in, GitHub, Agents, New workspaces, and Keyboard shortcuts. Each row opens its page. Repositories shows ⌥⌘A, and Keyboard shortcuts shows ⌥⌘/.',
  rationale:
    'Each setting also has search words that its row does not show, such as Claude and Codex for Agents, env for Cloud computer, and model for New workspaces. The Mac app adds This Mac to the Account group. Keyboard shortcuts opens app/account/shortcuts, because the shortcuts follow the account in every browser (decision 190, 9 November 2026).',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'settings' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

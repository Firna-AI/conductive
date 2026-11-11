import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../screens/CommandPaletteScreen'

export const commandPalette = defineScreen({
  title: 'Command palette',
  description:
    '⌘K, or Search under New workspace, opens one search over the app. The All tab starts with the recent workspaces, then the actions of the page, with Send feedback last, then the settings. On desktop, each action and setting with a shortcut ends with it, as small key chips: New workspace shows ⌥⌘N, because a Chrome tab keeps ⌘N, the switches to Futex and Firna show ⌃2 and ⌃3, Repositories shows ⌥⌘A, and Keyboard shortcuts shows ⌥⌘/. The first row is highlighted, so Enter runs it, and the arrows move the highlight. On a phone the palette is a page in place of the list, and Cancel goes back.',
  rationale:
    'The user asked for a palette like the one in Conductor on 8 November 2026, with the tabs All, Workspaces, Actions, and Settings. It finds the workspaces of the current org. A workspace row shows the state mark, the name, the repository, and the age of the last activity, as the list does, and no coloured bar at its edge. Decision 145 gave only the palette a key. The user then chose option A of decision 190 and option B of decision 191 on 9 November 2026, and option B of decision 192 on 10 November 2026, so each command has its keys, and a row shows the first key of its command that works in a normal Chrome tab on a Mac. So the palette teaches the keys. A workspace row shows no key, because Open workspace 1 to 9 follow the places in the list, and the palette orders the workspaces by their latest activity. A phone shows no keys, as its Search row shows none. The recent workspaces come by their latest activity, from decision 146, and the open workspace is never among them.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'all' },
  useCasePaths: [
    'user-flows/open-workspace-from-palette',
    'user-flows/send-feedback',
  ],
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})

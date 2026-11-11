import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../screens/CommandPaletteScreen'

export const commandPalette = defineScreen({
  title: 'Command palette',
  description:
    '⌘K, or Search under New workspace, opens one search over the app. The All tab starts with the recent workspaces, then the actions of the page, with Send feedback last, then the settings. The first row is highlighted, so Enter runs it, and the arrows move the highlight. On a phone the palette is a page in place of the list, and Cancel goes back.',
  rationale:
    'The user asked for a palette like the one in Conductor on 8 November 2026, with the tabs All, Workspaces, Actions, and Settings. It finds the workspaces of the current org. A workspace row shows the list mark, the name, the repository, and the age of the last activity, as the list does, and no coloured bar at its edge. The mark means what it means in the list: the GitHub state in its colour, and motion while the agent works. Only the palette has a key, from decision 145. The recent workspaces come by their latest activity, from decision 146, and the open workspace is never among them.',
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

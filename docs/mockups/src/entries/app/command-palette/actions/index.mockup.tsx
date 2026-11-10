import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteActions = defineScreen({
  title: 'Actions tab',
  description:
    'Over the list, the actions of Acme come first: New workspace, with ⌥⌘N, and New section. Create org and a switch to each other org follow, with ⌃2 and ⌃3. A switch to an org opens its list.',
  rationale:
    'The palette offers only what the page offers to the person, from the main actions that the app has today, as the user chose in decision 144. Resume, the owner picker, Sign out, and the pull request actions stay where they are. A row shows the first key of its command that works in a Chrome tab, so New workspace and New session show their second keys ⌥⌘N and ⌥⌘T (decision 191, 9 November 2026).',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'actions' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'workspace',
      title: 'In a workspace',
      description:
        'Over an open workspace, its actions come first: New session, Session history, a Go to row for each tab of the right column, and Archive workspace. New session shows ⌥⌘T, Go to Changes ⌥⌘U, Go to Terminal ⌘J, and Archive workspace ⇧⌘A. Only the owner of the workspace and the admins of the org see Archive. A phone opens the palette from the list, so its page shows the actions of the list.',
      props: { over: 'workspace' },
    },
  ],
})

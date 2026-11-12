import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteActions = defineScreen({
  title: 'Actions tab',
  description:
    'Over the list, the actions of Acme come first: New workspace, with ⌥⌘N, and New section. Create org and a switch to each other org follow, with ⌃2 and ⌃3. A switch to an org opens its list. The Help group ends the tab with Send feedback, with ⌥⌘F, which opens the Feedback dialog over the page.',
  rationale:
    'The palette offers only what the page offers to the person, from the main actions that the app has today, as the user chose in decision 144. Resume, the owner picker, Sign out, and the pull request actions stay where they are. Send feedback is the one exception: no other control opens the Feedback dialog, and the palette offers it on each page. The user asked for it on 10 November 2026, and chose its dialog in decision 270. A row shows the first key of its command that works in a Chrome tab, so New workspace and New session show their second keys ⌥⌘N and ⌥⌘T (decision 191, 9 November 2026). Send feedback is also a command of the Keyboard shortcuts tab, with the key of Conductor, ⌥⌘F. Its row shows that key, or the shortcut that the person gives it.',
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
        'Over an open workspace, its actions come first: New session, Session history, a Go to row for each tab of the right column, New terminal, and Archive workspace. New session shows ⌥⌘T, Go to Changes ⌥⌘U, Go to Terminal ⌘J, and Archive workspace ⇧⌘A. New terminal shows while the Terminal tool offers its +, so not at the limit of 10 terminals. Only the owner of the workspace and the admins of the org see Archive. The Help group still ends the tab. A phone opens the palette from the list, so its page shows the actions of the list.',
      rationale:
        'The user chose on 10 November 2026 that the palette offers New terminal after the Go to rows, as decision 3 of the terminal tabs change, as it offers New session beside the + of the sessions.',
      props: { over: 'workspace' },
    },
    {
      slug: 'archived',
      title: 'In an archived workspace',
      description:
        'Priya, a member who is not an admin, opens the palette over Checkout address autocomplete, which Cal archived. The actions of the workspace are Session history and Restore workspace. Neither row shows a shortcut, because neither command has a default one. An archived workspace has no new session and no right column to go to, and Archive workspace is gone. A phone opens the palette from the list, so its page shows the actions of the list.',
      rationale:
        'The user chose option B of decision 2 of PR #138 on 10 November 2026: every member of an org that is not suspended may restore, also a workspace of another member. Archive stays with the owner of the workspace and the admins of the org. Restore workspace shows while the app keeps the cloud computer. A suspended org offers no Restore. An agent call of the same day makes Restore workspace a command of the Keyboard shortcuts tab without a default shortcut, so this row shows the shortcut that a person gives it.',
      props: { over: 'archived' },
    },
  ],
})

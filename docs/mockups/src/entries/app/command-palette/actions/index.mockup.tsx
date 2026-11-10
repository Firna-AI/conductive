import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteActions = defineScreen({
  title: 'Actions tab',
  description:
    'Over the list, the actions of Acme come first: New workspace and New section. Create org and a switch to each other org follow. A switch to an org opens its list.',
  rationale:
    'The palette offers only what the page offers to the person, from the main actions that the app has today, as the user chose in decision 144. Resume, the owner picker, Sign out, and the pull request actions stay where they are.',
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
        'Over an open workspace, its actions come first: New session, Session history, a Go to row for each tab of the right column, New terminal, and Archive workspace. New terminal shows while the Terminal tool offers its +, so not at the limit of 10 terminals. Only the owner of the workspace and the admins of the org see Archive. A phone opens the palette from the list, so its page shows the actions of the list.',
      rationale:
        'The user chose on 10 November 2026 that the palette offers New terminal after the Go to rows (decision 250), as it offers New session beside the + of the sessions.',
      props: { over: 'workspace' },
    },
  ],
})

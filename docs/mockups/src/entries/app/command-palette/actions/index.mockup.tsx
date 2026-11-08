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
    'The palette offers only what the page offers to the person, from the actions that the app has today, which every option of decision 144 keeps. The pull request actions stay on the pull request bar.',
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
        'Over an open workspace, its actions come first: New session, Session history, a Go to row for each tab of the right column, and Archive workspace. Only the owner of the workspace and the admins of the org see Archive. A phone opens the palette from the list, so its page shows the actions of the list.',
      props: { over: 'workspace' },
    },
  ],
})

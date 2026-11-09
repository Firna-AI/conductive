import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteSearch = defineScreen({
  title: 'Search',
  description:
    'Cal types "check". Checkout address autocomplete is the first result, and Enter opens it. An archived workspace matches too, in its own group after the other results.',
  rationale:
    'A search looks at the name, the label of the number, the branch, and the repository of each workspace, and at the label and the search words of each action and setting. It ignores case, and each word of the query must match. Archived workspaces come last, so the active ones stay first.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'search' },
  useCasePaths: ['user-flows/open-workspace-from-palette'],
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'number',
      title: 'Number',
      description:
        'Cal types "W-395", the label that a teammate wrote in a message. Checkout address autocomplete is the only result, and its row shows W-395 before the name. Enter opens it. "395" alone finds the same row.',
      rationale:
        'The user chose option D of decision 151 on 9 November 2026: the search also finds a workspace by its number. The search looks at the label as one more text of each workspace, with the same rules as the name. A row shows the label only when the query matches it, so the other rows keep the layout of the list.',
      props: { view: 'number' },
    },
    {
      slug: 'number-part',
      title: 'Part of a number',
      description:
        'Cal types "39". Each workspace whose label holds 39 matches, and each row shows its label before the name, so Cal can tell the rows apart. The archived Checkout page redesign, W-393, matches too, in its own group after the others.',
      rationale:
        'The label shows in each row that the query matches by its number. Without it, a person could not tell which workspace has which number.',
      props: { view: 'number-part' },
    },
    {
      slug: 'no-results',
      title: 'No results',
      description:
        'Nothing in Acme matches "refund". The palette says so, and names what a search looks at.',
      props: { view: 'no-results' },
    },
  ],
})

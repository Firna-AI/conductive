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
    'A search looks at the name, the label of the number, the branch, and the repository of each workspace, and at the label and the search words of each action and setting. It ignores case, and each word of the query must match. Archived workspaces come last, so the active ones stay first. While the workspace data loads, or after its read failed, a spinner or a notice with Try again takes the place of the workspace groups, as the user chose in decision 164. So a search never gives a partial answer as a complete one.',
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
        'The user chose option D of decision 212 on 9 November 2026: the search also finds a workspace by its number. The search looks at the label as one more text of each workspace, with the same rules as the name. A row shows the label only when the query matches it, so the other rows keep the layout of the list.',
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
    {
      slug: 'loading',
      title: 'Repositories loading',
      description:
        'Cal types "new" while the palette still loads the repository names, which a search looks at. A spinner stands first, in place of the workspace groups. The actions and the setting that match show under it, and New workspace is highlighted.',
      props: { view: 'search-loading' },
    },
    {
      slug: 'unavailable',
      title: 'Workspaces not loaded',
      description:
        'The workspace list of Acme did not load, and Cal types "new". The notice "The workspaces didn\'t load" stands first, in place of the workspace groups, with the message of the server and Try again, which reads the list again. The actions and the setting that match show under it. On desktop, the list behind the palette shows the same failure. With an empty field, the same status part stands before Actions on the All tab, in place of Recent workspaces.',
      props: { view: 'search-unavailable' },
    },
    {
      slug: 'repositories-unavailable',
      title: 'Repositories not loaded',
      description:
        'The workspace list of Acme is ready, but the repository names did not load, and Cal types "new". A search looks at those names, so the notice "The repositories didn\'t load" stands first, in place of the workspace groups. It has the message of the server and Try again, which reads the names again. The actions and the setting that match show under it. With an empty field, the All tab needs only the list, so the recent workspaces show without their repositories. A status part stands before Actions there only while the list loads or after it failed.',
      props: { view: 'search-repositories-unavailable' },
    },
  ],
})

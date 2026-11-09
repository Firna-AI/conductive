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

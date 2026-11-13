import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const branchPicker = defineScreen({
  title: 'Branch picker',
  description:
    'Cal pressed the branch control. The picker opens below it, with a search field at the top. main comes first, with the note default, and its check shows that the form holds it. The other branches of acme/storefront follow, newest commit first, each with the time since its newest commit. A press on calummoore/checkout-autocomplete picks it and shows the target choice, and a press on main closes the picker. A phone opens the picker as a sheet, with rows of touch size. The variants show a search, a search without a match, the list while it loads, and a read of GitHub that failed.',
  rationale:
    'The Worker reads the branches live from GitHub with the GitHub token of the member, for one repository of the org, and it stores no list, as the design calls of the plan say. So the browser gets no token, and each member sees only what GitHub shows to that member. The default branch comes first, because it is the usual start, and the newest commits come next, because members pick the branches that they work on now. The default branch needs no read of GitHub, so its row shows in every state of the list. A repository without other branches, such as an empty repository, shows only that row. The rows look like the rows of the menus of the app, with the muted detail in the label font.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, branchMenu: 'open' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'search',
      title: 'Search',
      description:
        'Cal typed checkout. The list keeps the two branches whose names hold it, newest commit first, and it highlights the first one, which Enter picks. The name main does not hold it, so its row goes too.',
      rationale:
        'The search matches any part of a name, so a login or a word of the name finds the branch. The route of the list takes the search, so the search also finds a branch of a long list that the first rows do not show.',
      props: { branchMenu: 'search' },
    },
    {
      slug: 'no-match',
      title: 'No match',
      description:
        'No branch name holds zipcode, so one line says Nothing matches “zipcode” in place of the rows. The text stays as Cal typed it.',
      rationale:
        'The words follow the command palette and the list of `@`, which say the same when a search finds nothing.',
      props: { branchMenu: 'no-match' },
    },
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The picker just opened, and the Worker reads the branches from GitHub. main shows at once, and one line says Loading branches… in place of the other rows. They show as soon as the read answers.',
      rationale:
        'The form knows the default branch without a read of GitHub, so Cal can pick it at once.',
      props: { branchMenu: 'loading' },
    },
    {
      slug: 'failed',
      title: 'Read failed',
      description:
        'GitHub did not answer the read of the branches. main still shows, and a notice under it says that the branches did not load, with Try again, which reads them again.',
      rationale:
        'The notice names what failed and gives one recovery. A failed read does not stop the form: Cal can still start from main and send.',
      props: { branchMenu: 'failed' },
    },
  ],
})

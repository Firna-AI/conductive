import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const branchSearch = defineScreen({
  title: 'Search and list states',
  description:
    'Cal typed "gift" in the search field of the branch picker. The picker finds the open pull request #486 by its title and its branch. New branch stays first, so the default is always one step away.',
  rationale:
    'The search reads the number, the title, and the branch of each pull request, and the name of each branch.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, picker: 'search' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'no-match',
      title: 'No match',
      description:
        'The search "tax" finds no pull request and no branch. A line under New branch says so.',
      props: { picker: 'no-match' },
    },
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The picker reads the branches and the open pull requests from GitHub through the app. While they load, New branch is already there, and a spinner stands under it.',
      props: { picker: 'loading' },
    },
    {
      slug: 'failed',
      title: 'Not loaded',
      description:
        'The branches did not load. New branch stays, and the notice under it names the failure, with Try again.',
      rationale:
        'A list that did not load shows the same notice as the other lists of the app. New branch needs no list, so the default still works.',
      props: { picker: 'failed' },
    },
  ],
})

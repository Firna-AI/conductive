import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const branchPicker = defineScreen({
  title: 'Existing branch',
  description:
    'The quiet link under the repository picker, Use an existing branch, opened the branch picker. A search field comes first. New branch stays first and checked, from main. Then come the open pull requests of acme/storefront, and the branches without a pull request, each with the age of its last commit. The picker leaves out main, the default branch. #482 is the pull request of Checkout address autocomplete, a workspace that is still open, and nothing warns about it. #477 comes from the fork lena-ko/storefront, so its row is off, says that its branch is in another repository, and offers Open on GitHub. On a phone the picker opens in a sheet, with the same rows. The child pages show a chosen branch, the dialog, and a search.',
  rationale:
    'The user chose on 8 November 2026 that New branch stays the default of New workspace, and that a quiet control picks an existing branch, because that choice is not common. The user chose on 9 November 2026 that two open workspaces can use one branch, and that the app shows nothing. A branch with an open pull request shows only as that pull request, so that no branch shows twice. A repository can have many branches, so the picker has a search field. The menu is the menu of the other pickers, with a search field above its rows. The user chose on 10 November 2026 that a pull request from another repository stays in the list as unavailable, by the ID of its head repository, so the user sees why it cannot continue.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, picker: 'open' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

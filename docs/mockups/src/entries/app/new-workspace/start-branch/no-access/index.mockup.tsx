import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const branchNoAccess = defineScreen({
  title: 'No GitHub access',
  description:
    "Priya, a member of Acme, opens the branch picker, and her GitHub account cannot read acme/storefront. main shows, and a notice under it says that her GitHub account can't read acme/storefront, and that its branches show here once she has access on GitHub. A phone shows the same notice in the sheet.",
  rationale:
    'The Worker reads the list with the GitHub token of the member, so a member without access to the repository on GitHub gets no branches. The notice says why, and it does not claim that the repository has no other branches. Access comes from GitHub, so the notice offers no action in the app.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, branchMenu: 'no-access', viewer: 'member' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'refused',
      title: 'Refused for no access',
      description:
        "Priya kept a draft that starts from calummoore/checkout-autocomplete and targets it. Since then she lost her access to acme/storefront on GitHub. Send gets a refusal: the notice over the composer says that the workspace wasn't created, because her GitHub account can't read acme/storefront, and that her message is kept. Try again sends it again, which works once she has access.",
      rationale:
        'The branch check of the create reads the picked branch with the GitHub token of the sender, as the design calls of the plan say. When that token cannot read the repository, the refusal says so, and it does not claim that the branch is missing. A start from the default branch skips the branch check, so only a picked branch gets this refusal.',
      props: { branchMenu: 'closed', branch: 'picked', result: 'no-access' },
    },
  ],
})

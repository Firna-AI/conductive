import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const branchChosen = defineScreen({
  title: 'Branch chosen',
  description:
    'Cal chose the branch calummoore/oslo-3f8k. The line under the repository picker now says that the workspace continues that branch, and Change opens the picker again with that branch still checked, where New branch goes back to the default. Send creates the workspace on that branch.',
  rationale:
    'A workspace on an existing branch keeps the name of that branch, so the line names it in full. Its first start fetches the branch and checks it out with tracking. When the branch is gone from GitHub at the start, the start fails and names that cause.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, branch: 'existing' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'pull-request',
      title: 'Pull request chosen',
      description:
        'Cal chose the open pull request #486, Gift cards at checkout. The line names the pull request, and the workspace continues its branch, priyaraman/gift-cards. Change opens the picker again with the pull request still checked.',
      rationale:
        'A pull request names its work better than its branch, so the line shows its number and title.',
      props: { branch: 'pull-request' },
    },
    {
      slug: 'change',
      title: 'Change, branch kept',
      description:
        'Cal chose Change after choosing calummoore/oslo-3f8k. The picker opens with that branch still checked, so opening it does not reset the choice.',
      props: { branch: 'existing', picker: 'open' },
    },
    {
      slug: 'pull-request-change',
      title: 'Change, pull request kept',
      description:
        'Cal chose Change after choosing #486. The picker opens with the pull request still checked.',
      props: { branch: 'pull-request', picker: 'open' },
    },
  ],
})

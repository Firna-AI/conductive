import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const branchMissing = defineScreen({
  title: 'Missing branch',
  description:
    "Cal sent the message from calummoore/checkout-autocomplete, and GitHub no longer has that branch: pull request #482 merged while Cal wrote, and GitHub deleted its branch. The create is refused. The notice over the composer says that the workspace wasn't created, that the branch calummoore/checkout-autocomplete is no longer on GitHub, and that the message is kept. Start from main puts the control back on main, without the target choice, and keeps the message, so Send then creates the workspace from main.",
  rationale:
    'Cal chose option A of decision 293 on 13 November 2026: the create from New workspace runs the same branch check as the create of an agent, so a missing branch gets a refusal, and the composer keeps the message. A start that fails later would fail the same way at each Try again, and a quiet start from the default branch would start from a branch that Cal did not pick. So the refusal offers one recovery, a start from the default branch, and Cal can still pick any other branch with the control.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, branch: 'picked', result: 'missing-branch' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

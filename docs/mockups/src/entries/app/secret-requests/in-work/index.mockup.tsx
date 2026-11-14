import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const secretRunInWork = defineScreen({
  title: 'In the work of a turn',
  description:
    'The turn of the count ended, and its work folded. The fold is open: after the first message of the agent, the tool call line of the agent and the card of its run with PROD_DATABASE_URL show at their place among the steps.',
  rationale:
    'When its turn ends, a run folds with the work of the turn at its place, as a Mac command card does (decision 151). Only a late request stays out of the fold, as app/secret-requests/late shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-in-work', fold: 'open' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

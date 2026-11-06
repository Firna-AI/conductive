import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const noCommits = defineScreen({
  title: 'No commits yet',
  description:
    'A new workspace whose agent works on its first message and has not committed yet. The bar shows the branch, its target, and No commits yet, without Create pull request. On a phone the row is not a link. The Checks tab waits for a pull request.',
  rationale:
    'The bar offers Create pull request only when the branch has commits, because GitHub opens no pull request without one (decision 18).',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    workspace: 'saved-carts',
    conversation: 'first-turn',
    banner: 'no-commits',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

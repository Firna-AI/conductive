import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const noCommits = defineScreen({
  title: 'No commits yet',
  description:
    'A new workspace whose agent works on its first message and has not changed a file yet. The bar shows the branch, its target, and No commits yet, without Create pull request. On a phone the row is not a link. The Checks tab waits for a pull request.',
  rationale:
    'The bar offers Create pull request when GitHub has commits of the branch, or when the sandbox has local work that the agent can commit first (decision 220). The link that creates the pull request on GitHub needs a commit on GitHub, because GitHub opens no pull request without one (decision 18).',
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
  variants: [
    {
      slug: 'local-work',
      title: 'Local work, no commits',
      description:
        'The agent changed files in the sandbox and has not committed them, so GitHub has no commit of the branch yet. The bar offers Create pull request, which asks the agent to commit, push, and open the pull request. It has no link to GitHub, which has nothing to compare. On a phone the row opens the Checks tab, whose top holds Create pull request.',
      props: { localWork: 'changes' },
    },
  ],
})

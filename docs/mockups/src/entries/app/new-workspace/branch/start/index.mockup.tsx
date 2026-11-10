import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const branchStart = defineScreen({
  title: 'Start on the branch',
  description:
    'Send on the chosen branch calummoore/oslo-3f8k created Saved carts in General, on that branch, with the message queued. Its first sandbox starts from the newest good build of Acme, fetches calummoore/oslo-3f8k from GitHub, and checks it out with tracking, in place of a new branch from main. The pull request bar shows the branch, which already has commits on GitHub.',
  rationale:
    'A workspace on an existing branch keeps the name of that branch, and its start fetches that branch and checks it out with tracking. A chosen open pull request starts the same way, on the branch of the pull request. When the branch is gone at the start, the start fails, as app/new-workspace/branch/gone shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts-branch',
    sandbox: 'starting',
    conversation: 'queued',
    banner: 'none',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

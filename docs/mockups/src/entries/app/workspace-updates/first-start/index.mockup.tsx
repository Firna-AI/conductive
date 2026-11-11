import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const updateFirstStart = defineScreen({
  title: 'Update at a first start',
  description:
    'Saved carts is a new workspace. The org image of Acme was built before a release, so it holds an earlier version of the agent and terminal software. Right after the start from the cloud computer of Acme, a start step updates that software. Then the start fetches main and creates the branch, and the first message waits until the sandbox is ready.',
  rationale:
    'The planning agent made this call on 9 November 2026, for image job decision 8 B: the update holds at the first workspace start too, because every workspace must get the fixes. Each refresh is a clean build from the software image, so an org image gets the current version within a day, or sooner after a push. In that time, each new workspace updates at its first start.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued',
    banner: 'no-commits',
    software: 'earlier',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

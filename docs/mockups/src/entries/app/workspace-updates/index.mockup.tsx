import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const workspaceUpdates = defineScreen({
  title: 'Workspace updates',
  description:
    'Checkout address autocomplete stopped before a release of Conductive, so its cloud computer holds an earlier version of the agent and terminal software. Opening it resumes its sandbox. Right after the resume, a start step says "Updating the agent and terminal software", and the agent starts once the update ends. The child pages show the update at the first start of a new workspace, a failed update, and the notice of a changed install script with its run.',
  rationale:
    'The user chose option B of image job decision 8 on 10 November 2026: a workspace start updates an earlier version of the app\'s own software before the agent starts, so every workspace gets the fixes, for one slower start after each release. The user chose option E of decision 1 on the same day: the start step and the build log use one name for that software, "the agent and terminal software". The update compares the recorded versions, so it reads no files in the sandbox.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'starting', software: 'earlier' },
  useCasePaths: ['user-flows/update-old-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

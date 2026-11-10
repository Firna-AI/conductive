import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const tools = defineScreen({
  title: 'Tools',
  description:
    'The terminal of the sandbox, here running the dev server while the agent works. On mobile a row of keys adds the keys that a phone keyboard lacks. The child pages show the Preview tool, its list after a failed repair, and the hidden Desktop.',
  rationale:
    'The tools sit in the lower panel of the right column, under the files, so the user sees the dev server and the changes together. The terminal follows the light or dark scheme of the app.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

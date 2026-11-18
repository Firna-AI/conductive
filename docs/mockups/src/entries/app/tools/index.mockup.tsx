import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const tools = defineScreen({
  title: 'Tools',
  description:
    'Three terminals of the cloud computer, as tabs above the shown terminal. Terminal 2 shows a test run, while the dev server runs in Terminal 1. The + at the end of the row opens a new terminal, and the close button of a tab closes its terminal. Every member of the workspace sees the same terminals. On mobile the tabs sit at the top of the Terminal page, and a row of keys adds the keys that a phone keyboard lacks. The child pages show the other states of the terminals, the Preview tool, its list after a failed repair, and the hidden Desktop.',
  rationale:
    'The tools sit in the lower panel of the right column, under the files, so the user sees the dev server and the changes together. The user chose terminal tabs in the Terminal tool on 10 November 2026, as decision 1 of the terminal tabs change: each tab is its own shell, and the tabs look like the tabs of the centre column. The terminal follows the light or dark scheme of the app.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    terminals: 'several',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

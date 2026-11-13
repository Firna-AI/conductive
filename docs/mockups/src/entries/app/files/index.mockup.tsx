import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const files = defineScreen({
  title: 'Files',
  description:
    'All files: every file of the branch as a tree, in the right column. A small square marks each added or modified file. A press on a file opens it in the temporary tab of the centre column, which the next press replaces, and a double-click on its row keeps the tab. The child pages show Changes, the tabs of a code file, a Markdown file, a diff, and an image, and the temporary tab.',
  rationale:
    'The right column holds the lists, and the centre column shows the content, so a file reads at full width beside the chat. All files, Changes, and Checks are links, so each view has its own address. On a phone the Files tab shows the same lists, and a file opens as a page with a way back. The other states of the page are child pages, so this page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press opens a file in the temporary tab, and a double-click keeps the tab, as the Temporary tab page shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

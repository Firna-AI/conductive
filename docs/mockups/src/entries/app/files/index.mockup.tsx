import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const files = defineScreen({
  title: 'Files',
  description:
    'All files: every file of the branch as a tree, in the right column. A small square marks each added or modified file. A file opens as a tab in the centre column. The child pages show Changes, and the tabs of a code file, a Markdown file, a diff, and an image.',
  rationale:
    'The right column holds the lists, and the centre column shows the content, so a file reads at full width beside the chat. All files, Changes, and Checks are links, so each view has its own address. On a phone the Files tab shows the same lists, and a file opens as a page with a way back. The other states of the page are child pages, so this page shows only its canonical screen.',
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

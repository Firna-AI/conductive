import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesMarkdown = defineScreen({
  title: 'Markdown preview',
  description:
    'README.md opened from All files: a tab in the centre column with the rendered Markdown. Its headings and its table of environment variables have the look of the headings and the tables in a reply of the chat. A switch shows the source instead, and the header can copy and download the file.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'markdown',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

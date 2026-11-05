import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const files = defineScreen({
  title: 'Files',
  description:
    'All files: every file of the branch as a tree. A small square marks each added or modified file, and a file with a preview opens it.',
  rationale:
    'All files, Changes, and Checks are links, so each view has its own address. On a phone the Files tab shows the same tabs, and a file opens full screen with a way back.',
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
  variants: [
    {
      slug: 'changes',
      title: 'Changes',
      description:
        'The files that the branch changes against the default branch: the folder, the name, the lines that each change adds and removes, and a square for added, modified, or deleted.',
      props: { files: 'changes' },
    },
    {
      slug: 'markdown',
      title: 'Markdown preview',
      description: 'A Markdown file, rendered as formatted text.',
      props: { files: 'markdown' },
    },
    {
      slug: 'code',
      title: 'Code preview',
      description: 'A code file with line numbers and syntax colours.',
      props: { files: 'code' },
    },
    {
      slug: 'diff',
      title: 'Diff preview',
      description:
        'A changed file opened from Changes shows its diff against the default branch.',
      props: { files: 'diff' },
    },
  ],
})

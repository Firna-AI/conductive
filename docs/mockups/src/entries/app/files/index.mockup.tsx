import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const files = defineScreen({
  title: 'Files',
  description:
    'All: every file of the branch as a tree. A letter marks each added or modified file, and a file with a preview opens it.',
  rationale:
    'All and Changes are links, so each view has its own address. On mobile the Files tab shows the list, and a file opens full screen with a way back.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'changes',
      title: 'Changes',
      description:
        'The files that the branch changes against the default branch, with the lines that each change adds and removes.',
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

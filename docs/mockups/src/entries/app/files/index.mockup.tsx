import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const files = defineScreen({
  title: 'Files',
  description:
    'All files: every file of the branch as a tree, in the right column. A small square marks each added or modified file. A file opens as a tab in the centre column.',
  rationale:
    'The right column holds the lists, and the centre column shows the content, so a file reads at full width beside the chat. All files, Changes, and Checks are links, so each view has its own address. On a phone the Files tab shows the same lists, and a file opens as a page with a way back.',
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
        'The files that the branch changes against the default branch, under a summary: the number of changed files and the lines that they add and remove. A changed file opens its diff as a tab.',
      props: { files: 'changes' },
    },
    {
      slug: 'markdown',
      title: 'Markdown preview',
      description:
        'README.md opened from All files: a tab in the centre column with the rendered Markdown. A switch shows the source instead, and the header can copy and download the file.',
      props: { tab: 'markdown' },
    },
    {
      slug: 'code',
      title: 'Code preview',
      description:
        'A code file opened from All files: a tab with line numbers and syntax colours. Its row in the list is marked.',
      props: { tab: 'code' },
    },
    {
      slug: 'diff',
      title: 'Diff preview',
      description:
        'AddressForm.tsx opened from Changes: a tab with its diff against the default branch.',
      props: { files: 'changes', tab: 'diff' },
    },
  ],
})

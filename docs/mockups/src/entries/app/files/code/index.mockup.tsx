import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesCode = defineScreen({
  title: 'Code preview',
  description:
    'A code file opened from All files: a tab with line numbers and syntax colours. Its row in the list is marked. A press on its chip in a message opens the same tab.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'code',
  },
  useCasePaths: ['user-flows/mention-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'at-line',
      title: 'At a line',
      description:
        'A press on the chip useAddressAutocomplete.ts:19-22 in an answer opened the same tab at those lines. The code shows in source mode, scrolled so that line 19 sits in the middle of the view. Lines 19 to 22 have a background colour. On a phone the file opens as its page in the same way. A line past the end of the file shows the top and marks nothing.',
      rationale:
        'The user chose option C of answer chip decision 2 on 13 November 2026: a chip that names a line opens the file at that line, so its name keeps its promise. The address of the tab gets `line=19-22`, so a modifier click opens a new browser tab at the lines. The line stays out of the workspace view, so the tab of another browser does not jump. A Markdown file opens in source mode too, because the rendered view has no line numbers.',
      props: {
        banner: 'ready-to-merge',
        conversation: 'file-answer',
        tab: 'code-lines',
      },
      useCasePaths: ['user-flows/open-a-file-from-an-answer'],
    },
  ],
})

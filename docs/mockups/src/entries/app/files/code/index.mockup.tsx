import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  largeBranchState,
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesCode = defineScreen({
  title: 'Code preview',
  description:
    'useAddressAutocomplete.ts, a code file that the user kept open from All files. Its kept tab has an upright title, and the file shows with line numbers and syntax colours. Its row in the list is marked. A press on its chip in a message shows the same tab.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a double-click on the row of a file keeps its tab, so the code file stays open beside the temporary tab of the next press. A press on a file that has a tab shows that tab, as a design call of 11 November 2026 says.',
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
    {
      slug: 'limited',
      title: 'Beside limited lists',
      description:
        'The same code file in a large branch, whose All files lists 50,000 of its 68,412 entries. The right column keeps the limited All files, with the row of useAddressAutocomplete.ts marked and the notice at the top. Each file link of the screen opens the limited page of its file or list: the rows and the tabs of the lists, the file tabs, and the chips of the chat. On a phone, the back link and the Files tab open the limited All files. The Checks tab and the other views of the workspace keep their standard pages.',
      rationale:
        'Runner file report limits keep the same lists while the member opens a file, from decision M4 = F, which Cal chose on 20 November 2026, and items 1 F, 2 B, and 3 A of 23 November 2026. One table of limited pages, which `ScreenLink` reads on a limited screen, sends each file link to its limited page. So no link drops back to the complete lists, as review finding 6 of 23 November 2026 asked.',
      props: { ...largeBranchState },
    },
  ],
})

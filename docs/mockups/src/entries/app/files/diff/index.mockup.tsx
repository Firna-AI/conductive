import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  largeBranchState,
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesDiff = defineScreen({
  title: 'Diff preview',
  description:
    'A press on AddressForm.tsx in Changes opened its diff against the default branch in the temporary tab, at the end of the row. Its title shows in italics, and the next press on a file or a diff replaces it. useAddressAutocomplete.ts stays open as a kept tab, with an upright title.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press on a changed file opens its diff in the temporary tab, as a press in All files opens a file. The Temporary tab page shows the next press and the ways to keep the tab.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'changes',
    focus: 'files',
    tab: 'diff',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'limited',
      title: 'Beside limited lists',
      description:
        'The same diff in a large branch, whose Changes lists 1,000 of its 2,243 changed files. The right column keeps the limited Changes, with the row of AddressForm.tsx marked and the notice under the summary. Each file link of the screen opens the limited page of its file or list: the rows and the tabs of the lists, the file tabs, and the chips of the chat. On a phone, the back link opens the limited Changes, and the Files tab opens the limited All files. The Checks tab and the other views of the workspace keep their standard pages.',
      rationale:
        'Runner file report limits keep the same lists while the member opens a file, from decision M4 = F, which Cal chose on 20 November 2026, and items 1 F, 2 B, and 3 A of 23 November 2026. One table of limited pages, which `ScreenLink` reads on a limited screen, sends each file link to its limited page. So no link drops back to the complete lists, as review finding 6 of 23 November 2026 asked.',
      props: { ...largeBranchState },
    },
  ],
})

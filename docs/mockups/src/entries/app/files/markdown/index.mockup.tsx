import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  largeBranchState,
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesMarkdown = defineScreen({
  title: 'Markdown preview',
  description:
    'A press on README.md in All files opened it in the temporary tab, at the end of the row, with the rendered Markdown. Its title shows in italics, and the next press on a file or a diff replaces it. useAddressAutocomplete.ts stays open as a kept tab, with an upright title. The headings and the table of environment variables have the look of the headings and the tables in a reply of the chat. So do the note in a quote under the title, its bold label, the italics, the line through the variable that the branch removed, the task list of Checkout with its fixed check boxes, and the rule before Tests. A cell of the table holds two lines, where the file has a line-break tag, and each cell stands at the top of its row. The picture of the suggestions is at a web address, so it shows its alt text as a link, and a press opens the picture in a new tab. The use of the hook under Checkout is in a code block with the fence label ts, so it shows the colours of a TypeScript file tab. The test commands under Tests have no label, so they stay plain text. A switch shows the source instead, and the header can copy and download the file.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press opens a file in the temporary tab. The Temporary tab page shows the next press and the ways to keep the tab. The switch between Preview and Source keeps the state of the tab, as a design call of 11 November 2026 says. On 18 November 2026, the user chose items 10 B, 11 C, 12 B, and 14 B of the Markdown plan: a picture at a web address shows its alt text as a link, as in the chat, and no picture loads. Bold text has weight 700 in both views, each cell stands at the top of its row, and the chat draws task boxes as the file preview does. On 26 November 2026, the user chose A of code colours decision 1: a code block takes the colours of a file tab from its fence label, in the file preview as in the chat, and a block without a label stays plain.',
  relatedDocs: ['docs/protocol/workspace-tools.md'],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'markdown',
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
        'The same README.md in a large branch, whose All files lists 50,000 of its 68,412 entries. The right column keeps the limited All files, with the row of README.md marked and the notice at the top. Each file link of the screen opens the limited page of its file or list: the rows and the tabs of the lists, the file tabs, and the chips of the chat. On a phone, the back link and the Files tab open the limited All files. The Checks tab and the other views of the workspace keep their standard pages.',
      rationale:
        'Runner file report limits keep the same lists while the member opens a file, from decision M4 = F, which Cal chose on 20 November 2026, and items 1 F, 2 B, and 3 A of 23 November 2026. One table of limited pages, which `ScreenLink` reads on a limited screen, sends each file link to its limited page. So no link drops back to the complete lists, as review finding 6 of 23 November 2026 asked.',
      props: { ...largeBranchState },
    },
  ],
})

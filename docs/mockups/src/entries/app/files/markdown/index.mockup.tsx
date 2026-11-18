import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesMarkdown = defineScreen({
  title: 'Markdown preview',
  description:
    'A press on README.md in All files opened it in the temporary tab, at the end of the row, with the rendered Markdown. Its title shows in italics, and the next press on a file or a diff replaces it. useAddressAutocomplete.ts stays open as a kept tab, with an upright title. The headings and the table of environment variables have the look of the headings and the tables in a reply of the chat. So do the note in a quote under the title, its bold label, the italics, the line through the variable that the branch removed, the task list of Checkout with its fixed check boxes, and the rule before Tests. A cell of the table holds two lines, where the file has a line-break tag, and each cell stands at the top of its row. The picture of the suggestions is at a web address, so it shows its alt text as a link, and a press opens the picture in a new tab. A switch shows the source instead, and the header can copy and download the file.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press opens a file in the temporary tab. The Temporary tab page shows the next press and the ways to keep the tab. The switch between Preview and Source keeps the state of the tab, as a design call of 11 November 2026 says. On 18 November 2026, the user chose items 10 B, 11 C, 12 B, and 14 B of the Markdown plan: a picture at a web address shows its alt text as a link, as in the chat, and no picture loads. Bold text has weight 700 in both views, each cell stands at the top of its row, and the chat draws task boxes as the file preview does.',
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
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesMarkdown = defineScreen({
  title: 'Markdown preview',
  description:
    'A press on README.md in All files opened it in the temporary tab, at the end of the row, with the rendered Markdown. Its title shows in italics, and the next press on a file or a diff replaces it. useAddressAutocomplete.ts stays open as a kept tab, with an upright title. The headings and the table of environment variables have the look of the headings and the tables in a reply of the chat. A switch shows the source instead, and the header can copy and download the file. Find beside Copy opens the find bar, as the `find` variant shows.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press opens a file in the temporary tab. The Temporary tab page shows the next press and the ways to keep the tab. The switch between Preview and Source keeps the state of the tab, as a design call of 11 November 2026 says.',
  relatedDocs: [],
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
      slug: 'find',
      title: 'Find in a Markdown preview',
      description:
        'The find bar over README.md, under the header and above the preview. “checkout” has 3 matches: in a cell of the table of environment variables, in the heading Checkout, and in the paragraph under it. The current match, 1 of 3, is in the cell. On a phone, Find in the header of the page opened the bar, and the on-screen keyboard covers the bottom of the preview.',
      rationale:
        'Find searches only the text that the tab shows, never the stored text, as the design of find decision 1 B says. So the preview finds its rendered text, without the marks of Markdown, and the Source view finds the source. A match stays inside one block, such as one cell, one heading, or one paragraph.',
      relatedDocs: ['docs/protocol/find-in-tab.md'],
      props: { find: 'found' },
    },
  ],
})

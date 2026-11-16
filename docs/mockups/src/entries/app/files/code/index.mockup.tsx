import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesCode = defineScreen({
  title: 'Code preview',
  description:
    'useAddressAutocomplete.ts, a code file that the user kept open from All files. Its kept tab has an upright title, and the file shows with line numbers and syntax colours. Its row in the list is marked. A press on its chip in a message shows the same tab. The header has Find beside Copy, with the tooltip “Find in useAddressAutocomplete.ts (⌘F)”, which opens the find bar, as the `find` variant shows.',
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
      slug: 'find',
      title: 'Find in a code file',
      description:
        'Find in the header, or ⌘F, opened the find bar over useAddressAutocomplete.ts. The bar sits under the header and above the code, so it does not scroll with the code. “query” has 6 matches, also in `MIN_QUERY_LENGTH`, because a match ignores case. The current match, 2 of 6, is solid amber, and the other matches keep the syntax colour of their text on a tint of amber. The line numbers are never matched. On a phone the file is a page of the Files tab, which has no tab row, so Find in its header opened the bar, and the on-screen keyboard covers the bottom of the code.',
      rationale:
        'The user chose B of find decision 1 on 13 November 2026. A match can cross the coloured tokens of one line, but not two lines. The bar searches the drawn lines of the file, up to the read limit of 5 MiB, and colours at most 5,000 matches, the ones nearest the current match. A file over the limit, a binary file, and a file that did not load offer no Find, so their Find is off, as their Copy is.',
      relatedDocs: ['docs/protocol/find-in-tab.md'],
      props: { find: 'found' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesDiff = defineScreen({
  title: 'Diff preview',
  description:
    'A press on AddressForm.tsx in Changes opened its diff against the default branch in the temporary tab, at the end of the row. Its title shows in italics, and the next press on a file or a diff replaces it. useAddressAutocomplete.ts stays open as a kept tab, with an upright title. The header has Find beside Copy, which opens the find bar, as the `find` variant shows.',
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
      slug: 'find',
      title: 'Find in a diff',
      description:
        'The find bar over the diff of AddressForm.tsx, under the header and above the diff. “line1” has 7 matches on unchanged, added, and removed lines. The current match, 3 of 7, is on an added line. The fill of each line shows through the tint of its matches. The line numbers and the + and − signs are never matched. On a phone, Find in the header of the page opened the bar, and the on-screen keyboard covers the bottom of the diff.',
      rationale:
        'The user chose B of find decision 1 on 13 November 2026. The signs and the numbers of a diff are marks, not text that a person reads, so find skips them, as it skips the line numbers of a code file. A match can cross the coloured tokens of one line.',
      props: { find: 'found' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesDiff = defineScreen({
  title: 'Diff preview',
  description:
    'A press on AddressForm.tsx in Changes opened its diff against the default branch in the temporary tab, at the end of the row. Its title shows in italics, and the next press on a file or a diff replaces it. useAddressAutocomplete.ts stays open as a kept tab, with an upright title. The switch in the header shows Changes, which is selected, and File.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press on a changed file opens its diff in the temporary tab, as a press in All files opens a file. The Temporary tab page shows the next press and the ways to keep the tab. The switch at the end of the header shows Changes and File, with Changes selected. File shows the current text of the file in the same tab, as file view decision 1 says.',
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
      slug: 'file',
      title: 'Current file of a changed file',
      description:
        'A press on AddressForm.tsx in All files opened its current text in the temporary tab, with line numbers and syntax colours. Its row in All files is marked. The switch in the header shows Changes and File, with File selected. Changes shows the diff of the file in the same tab, in its place in the row, and the tab stays temporary. On a phone the file opens as its page, and the switch sits in a bar below the header, with the names of the views.',
      rationale:
        'The user asked on 16 November 2026 for a file preview that shows the changes and the current state of a file, with a switch between them, as file view decision 1 says. One tab changes its view in place, so the row does not get a second tab for the same file, as a design call of 16 November 2026 says.',
      props: {
        files: 'all',
        tab: 'diff-file',
      },
    },
  ],
})

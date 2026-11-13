import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const splitDrag = defineScreen({
  title: 'Drag to a new pane',
  description:
    'The user drags the tab of Debounce the address lookups to 250 ms over the right half of the chat. A drop mark covers that half: an outline in the accent colour over a light tint, and the chat stays readable under it. The tab lifts under the pointer as a raised card, and a faint copy stays at its place in the row. A drop opens the right pane with that tab, as the Split panes page shows. Escape cancels the drag, and nothing moves. On a phone, a drop on the chat does nothing, so a long press lifts the tab in the row only, and the line marks its place.',
  rationale:
    'Split panes decision 1 C, which the user chose on 13 November 2026: a drag of a tab over one half of the content opens the second pane on that side, as in VS Code. Split panes decision 2 A, from the same day, allows side-by-side panes only, so the content has a left half and a right half. A design call of 13 November 2026 draws the drop mark as a drop of files on the message field looks: a full outline in the accent colour, so no edge of it is an accent strip, and a light tint over the area of the new pane. A screen reader hears "Moving Debounce the address lookups to 250 ms to a new right pane". A centre column narrower than two panes of 320 px shows no mark, because it opens no second pane.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, panes: 'drag-right', rightColumn: 'hidden' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'left',
      title: 'The left half',
      description:
        'The user drags useAddressAutocomplete.ts over the left half of the chat, and the drop mark covers that half. A drop opens a new left pane with the file, and the pane of the two sessions becomes the right pane. On a phone, the long press lifts the session tab in the row only, as on the page of this drag.',
      rationale:
        'Split panes decision 1 C, which the user chose on 13 November 2026: a drop on either half opens the new pane on that side, so the drag chooses the side. A design call of 13 November 2026 gives the new pane the focus, because the user dropped a tab on it. A screen reader hears "Moving useAddressAutocomplete.ts to a new left pane".',
      props: { panes: 'drag-left' },
    },
    {
      slug: 'pane',
      title: 'Onto the other pane',
      description:
        'The two panes of the Split panes page are open. The user drags useAddressAutocomplete.ts from the left row over the chat of the right pane, and the drop mark covers the whole right pane. A drop moves the tab to the end of the right row and shows it there, and the right pane keeps the focus. The left pane still shows Address autocomplete. On a phone, which shows one pane, the long press lifts Debounce the address lookups to 250 ms across the short line into the left part of the one row. The line marks the end of the left part. That drop moves the tab to the left pane, and the right pane, with no tab left, closes.',
      rationale:
        'Split panes decision 2 A, which the user chose on 13 November 2026, allows two panes at most. So with two panes, a drop on the content of a pane moves the tab into that pane, at the end of its row, and opens no third pane. The mark covers the whole pane, because a drop anywhere on it gives the same result. A design call of 13 November 2026 shows the moved tab in its new pane and gives that pane the focus. When the last tab of a pane moves out, the pane closes, and the other pane fills the column. A screen reader hears "Moving useAddressAutocomplete.ts to the right pane, place 2 of 2". On a phone, a move across the border of the two parts of the row moves the tab to the other pane, at that place.',
      props: { panes: 'drag-pane' },
    },
    {
      slug: 'row',
      title: 'Into the other row',
      description:
        'The user drags useAddressAutocomplete.ts from the left row into the right row, before Debounce the address lookups to 250 ms. The line of the drop shows in the right row, the lifted tab hangs below it, and the faint copy stays in the left row. A drop puts the tab at that place in the right row and shows it in the right pane. On a phone, the long press moves the session across the border of the two parts of the one row, as on the Onto the other pane page.',
      rationale:
        'A design call of 13 November 2026: a drop in the other row puts the tab at the drop place of that row, as a drop in its own row does (decision 186), so one drag places a tab. The line and the lifted tab look as in a move in one row. A screen reader hears "Moving useAddressAutocomplete.ts to the right pane, place 1 of 2". Escape cancels the drag, and nothing moves.',
      props: { panes: 'drag-row' },
    },
  ],
})

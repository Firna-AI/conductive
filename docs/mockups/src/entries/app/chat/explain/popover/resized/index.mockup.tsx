import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../../screens/workspaceState'

export const explainResized = defineScreen({
  title: 'A resized popover',
  description:
    'Cal made the popover of the long answer larger, 560 px wide and 600 px high, so more of the answer shows. The popover opens below the mark, from the start of the mark, so its bottom edge, its right edge, and the corner between them are free and have handles. The focus is on the height handle, so its hairline and its grip show. Up and Down move it, and the panel keeps its height until it closes. The room below the mark caps the height, so the frame of the catalogue shows less than 600 px, and the expanded frame shows more. On a phone the sheet has no handles and keeps half the height of the screen.',
  rationale:
    'A long answer shows only a few lines in a panel of 400 px by 420 px. The handles let Cal read more of the answer by its mark, with the parent chat still around it. The edges at the mark do not move, so the popover never covers the marked text. The browser keeps the size for the next popovers.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    explainMarks: 'asked',
    explainSession: 'long',
    explainOpen: 'popover-resized',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

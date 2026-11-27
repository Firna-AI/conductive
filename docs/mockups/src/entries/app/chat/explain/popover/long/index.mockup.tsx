import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../../screens/workspaceState'

export const explainLong = defineScreen({
  title: 'A long answer',
  description:
    'The agent wrote a longer answer, with a list and a test file. On a computer the popover keeps its highest height, and its chat scrolls inside it. The quote and the buttons stay at its top, and the follow-up field stays at its foot. The turn has ended, so the chat shows the top of the answer, and the member reads it from its start. On a phone the sheet keeps half the height of the screen, and its chat scrolls inside it.',
  rationale:
    'The written prompt asks for a short answer, because it shows in a popover. An agent can still write more. The popover keeps its size, so it covers no more of the parent chat. On a computer its handles make it larger, and Expand shows the whole chat in its tab.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    explainMarks: 'asked',
    explainSession: 'long',
    explainOpen: 'popover',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'full',
      title: 'Full height on a phone',
      description:
        'Cal dragged the handle of the sheet up. At full height the sheet stops under the tab row, so the parent tab and the tab of the explanation stay in view, and more of the answer shows. A drag down takes it back to half height. A computer has no sheet, so its popover stays as on the first screen of this page.',
      props: { explainOpen: 'popover-full' },
    },
  ],
})

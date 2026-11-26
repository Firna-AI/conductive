import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const explainPopover = defineScreen({
  title: 'Just after Explain',
  description:
    'Cal pressed Explain. The popover opened at once below the marked line, and the tab of the explanation opened at the end of the row. The agent works and has no answer yet, so the popover shows the working line under the quote. Stop ends the turn, and a follow-up steers it. The mark shows the spinner of a session tab, and the header shows Working. On a phone the popover is a sheet at half height. The child pages show the popover while the explanation runs, after a failed or stopped turn, while the cloud computer is stopped, with a long answer, and after Cal made it larger.',
  rationale:
    'Explain has no prompt field, so the popover opens at once with the state of the turn. The tab of the explanation opens at the end of the row, as every new tab does, and the parent tab stays shown, so the popover opens over the parent chat. The written prompt is the first message of the session. The popover leaves it out, so its chat starts with the work of the agent.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    explainMarks: 'asked',
    explainSession: 'working',
    explainOpen: 'popover',
  },
  useCasePaths: ['user-flows/explain-chat-text'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

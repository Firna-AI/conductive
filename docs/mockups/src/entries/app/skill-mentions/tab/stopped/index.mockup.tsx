import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const skillTabStopped = defineScreen({
  title: 'Cloud computer stopped',
  description:
    'The cloud computer stopped while Cal read the chat. The press on the chip opened the skill tab, and the open started the cloud computer again, as the open of a file tab does. The header of the workspace shows Starting. In place of the text, the tab waits for the start, with no Resume, also on a phone. When the start ends, the tab reads the text. When the cloud computer stops while the tab shows the text, the text stays, as a file stays in its tab.',
  rationale:
    'A stopped cloud computer acts for a skill tab as for a file tab, from decision 247: the open of the tab asks for the text, so it starts the cloud computer, and a Resume for a moment would be noise. A tab without text when the cloud computer stops shows the stopped state with Resume, as a file tab does. Moved here from a saved state of app/skill-mentions/tab/notices, so that the notices page keeps five screens with the failed read.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'skill-answer',
    focus: 'files',
    sandbox: 'starting',
    tab: 'skill',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'before-text',
      title: 'Stopped before the text came',
      description:
        'The cloud computer stopped while the tab still read the text of plans. The header of the workspace shows Stopped. In place of "Opening the skill", the tab shows the stopped state with Resume, also on a phone. Resume starts the cloud computer, and the tab then reads the text.',
      rationale:
        'A tab keeps the text that it shows when the cloud computer stops, as a file tab keeps its file (decision 247). A tab without text has no text to keep, so it shows the stopped state with Resume, as a file tab without its file does. The same holds for a later start that failed, with Try again.',
      props: { sandbox: 'stopped', tab: 'skill-loading' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../../screens/workspaceState'

export const explainRun = defineScreen({
  title: 'While the explanation runs',
  description:
    'The agent read the hook and the form, and it writes its answer. The popover shows each read, then the answer so far, then the working line, as a running turn shows them in a tab. Its chat keeps the newest line in view. Stop ends the turn.',
  rationale:
    'The popover shows the chat of the explanation as its tab does, because an explanation is a normal session. Only the written prompt stays out of it.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    explainMarks: 'asked',
    explainSession: 'answering',
    explainOpen: 'popover',
  },
  useCasePaths: ['user-flows/explain-chat-text'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'starting',
      title: 'While the cloud computer starts',
      description:
        'The cloud computer of the workspace was stopped. Cal pressed Explain, and the cloud computer starts. The written prompt waits in the queue, so the popover shows the steps of the start under the quote, as the end of a chat does. A follow-up waits in the queue too. The header shows Starting. The mark shows the spinner, because the explanation runs as soon as the cloud computer is ready.',
      rationale:
        'Explain sends at once, also while the sandbox does not run. The message waits in the queue of the workspace, as each message does, and the start of a stopped workspace begins.',
      props: { sandbox: 'starting', explainSession: 'working' },
    },
    {
      slug: 'follow-up',
      title: 'A follow-up runs',
      description:
        'After the answer, Cal asked "How many saved addresses have no postcode?" in the follow-up field. His message shows as in a tab, and the agent works on it. The work of the first turn stays folded. Stop ends the running turn.',
      props: { explainSession: 'follow-up' },
    },
    {
      slug: 'waiting',
      title: 'Waiting for input',
      description:
        'The agent asked to run its count with PROD_DATABASE_URL. The request waits above the follow-up field, with Deny and Allow, as it waits at the end of a tab. On a phone the sheet opens at full height while the request waits, so the card and the chat above it both have room. Until a member answers, the mark shows Needs input, and the header shows it too. Stop ends the turn.',
      props: { explainSession: 'waiting' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../../screens/workspaceState'

export const explainFailed = defineScreen({
  title: 'A failed turn',
  description:
    'The first turn of the explanation failed after one read, because Claude is overloaded. The popover shows the notice of a failed turn, with its cause and Try again, as a tab does. Try again sends the written prompt again. The mark shows the alert of a failed turn, in the danger colour.',
  rationale:
    'A failed turn of an explanation fails as in any session. The mark shows the failure, so a member who closed the popover sees it in the parent chat.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    explainMarks: 'asked',
    explainSession: 'failed',
    explainOpen: 'popover',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'stopped',
      title: 'A stopped turn',
      description:
        'Cal pressed Stop while the agent read the form. The popover shows the stopped read and the line "You stopped the agent". The mark shows an ended turn, and a follow-up starts a new turn.',
      props: { explainSession: 'stopped' },
    },
    {
      slug: 'computer-stopped',
      title: 'While the cloud computer is stopped',
      description:
        'The cloud computer of the workspace stopped after the answer. Cal pressed the mark, and the popover shows the answer to read. The bar of a stopped tab, "Sandbox stopped" with Resume, takes the place of the follow-up field, as it takes the place of the composer under the parent chat. Resume starts the cloud computer, and the field shows again while it starts. The mark shows an ended turn. On a phone the sheet shows the same bar at its foot.',
      rationale:
        'The popover behaves as a tab. A message from a tab does not start a stopped cloud computer, so the bar with Resume takes the place of the composer, and of the follow-up field too. Only a press on Explain starts the cloud computer with its message.',
      props: { sandbox: 'stopped', explainSession: 'answered' },
    },
  ],
})

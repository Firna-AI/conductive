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
  ],
})

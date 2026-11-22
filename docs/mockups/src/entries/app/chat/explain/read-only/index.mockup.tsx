import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const explainReadOnly = defineScreen({
  title: 'Read-only workspace',
  description:
    'Checkout address autocomplete is archived. The marks stay. Each shows an ended turn, because no turn runs while the cloud computer is stopped, and the failed explanation keeps its alert. Cal selected text in his first message, and no Explain shows, also on a phone. A press on a mark opens the popover to read.',
  rationale:
    'A read-only workspace shows the marks and opens the popover to read. It starts no explanation, because an explanation starts a session.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    sandbox: 'archived',
    explainMarks: 'states',
    explainSession: 'answered',
    explainOpen: 'select-message',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'popover',
      title: 'Read-only popover',
      description:
        'The popover shows the chat of the explanation to read. It has no follow-up field and no Stop, because the archived workspace takes no message. Expand shows its tab, and the close button goes back to the marks.',
      props: { explainOpen: 'popover' },
    },
  ],
})

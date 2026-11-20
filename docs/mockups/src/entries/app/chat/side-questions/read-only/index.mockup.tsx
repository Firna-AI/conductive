import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const sideQuestionReadOnly = defineScreen({
  title: 'Read-only workspace',
  description:
    'Checkout address autocomplete is archived. The marks stay, and each shows an ended turn, because no turn runs while the cloud computer is stopped. Cal selected text in his first message, and no Ask about this shows, also on a phone. A press on a mark opens the overlay to read.',
  rationale:
    'A read-only workspace shows the marks and opens the overlay to read. It starts no side question, because a side question starts a session.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    sandbox: 'archived',
    sideMarks: 'states',
    sideSession: 'idle',
    sideOpen: 'select-message',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'overlay',
      title: 'Read-only overlay',
      description:
        'The overlay shows the chat of the side session to read. The bar of the archived workspace takes the place of the composer, as in the parent chat, so the overlay has no Stop and no Send. Open as tab shows its tab.',
      props: { sideOpen: 'overlay' },
    },
  ],
})

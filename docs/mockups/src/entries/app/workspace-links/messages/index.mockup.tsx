import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/link-a-workspace']

export const workspaceLinkMessages = defineScreen({
  title: 'Pasted link',
  description:
    'In Checkout address autocomplete, Cal pasted the link of Saved carts into the message box. The link became a chip in the text at once, between the words before and after it. The list shows Saved carts at the top of General, where its agent works on the first message.',
  rationale:
    'The box keeps plain text with the link of each chip, so a draft that comes back shows the same chips. A chip is one unit of the text: a press places the caret, and Backspace removes the whole chip. Under the pointer, a × takes the place of the mark of the chip, as `app/file-mentions/chips/workspace-chip` shows (decision 215).',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'workspace-link' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'sent',
      title: 'Sent',
      description:
        'Cal sent the message. It shows the chip of Saved carts, and the agent looks for the branch of that workspace.',
      rationale:
        'The agent gets the plain link. The list call of the agent tools gives the number and the link of each workspace, so the agent knows which workspace the link names.',
      props: { conversation: 'link-sent', composer: 'empty' },
      useCasePaths: flow,
    },
    {
      slug: 'other-org',
      title: 'Link of another org',
      description:
        'Cal sent the link of a workspace of Futex, another org of Cal. It stays plain text, and the long link breaks to fit the line. A link to a workspace that was removed, or that the reader cannot see, stays plain text in the same way.',
      rationale:
        'The chat finds a workspace only in the list of the org that it shows. So a link of another org stays plain text, also for a member of both orgs. The agent also acts only in its own org.',
      props: { conversation: 'other-org-link', composer: 'empty' },
    },
  ],
})

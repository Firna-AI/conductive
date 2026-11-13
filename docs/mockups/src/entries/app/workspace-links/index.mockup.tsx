import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const workspaceLinks = defineScreen({
  title: 'Workspace links',
  description:
    'Each workspace has a number in its org, shown as a label such as W-395. In the header the label follows the name, and it copies the link of the workspace. On desktop, its tooltip says “Copy link to W-395 (⇧⌘C)”, with the key of Copy link. Cal pasted the link of Saved carts into a message, and the agent answered. The message and the answer show each link to a workspace of Acme as a chip: the list mark, the label, and the current name. A Markdown link shows as the chip alone. Retry failed webhooks has output that Cal has not read, so its chip shows the name in bold. Postcode lookup for the shipping and billing forms left the list after its 14 days, and its chip still shows, with the archived mark. Its long name is cut short. A link in code stays code. A press on the chip of Saved carts opens that workspace, and a press on the chip of Postcode lookup opens its read-only chat. The child pages show Copy link in the header, and a message with a link before and after Send.',
  rationale:
    'The user chose option D of decision 211 and option D of decision 212 on 9 November 2026. A message keeps the plain link, which holds the ID of the workspace, so the agent reads the link, and the label can change later. The chip shows the GitHub state and the state of the agent now, which matters when one workspace waits for another. Its mark means what the mark of the list means. A bold name alone marks unread output, as in the list, because a green mark means passed checks. The chat finds each workspace in the list of the org, with the archived ones and the removed ones, so a phone shows the same chips without a list on the screen. A removed workspace keeps its chip, because only a direct link opens it, from option B of decision 519. The number shows only in the header and in chips, so the rows of the list keep their layout. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'link-answer',
    banner: 'checks-running',
  },
  useCasePaths: [
    'user-flows/link-a-workspace',
    'user-flows/open-a-removed-workspace',
  ],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const workspaceLinks = defineScreen({
  title: 'Workspace links',
  description:
    'Each workspace has a number in its org, shown as a label such as W-395. In the header the label follows the name, and it copies the link of the workspace. Cal pasted the link of Saved carts into a message, and the agent answered. The message and the answer show each link to a workspace of Acme as a chip: the state mark, the label, and the current name. A Markdown link shows as the chip alone. An archived workspace keeps its chip, with the archived mark, and a long name is cut short. A link in code stays code. A press on the chip of Saved carts opens that workspace. The child pages show Copy link in the header, and a message with a link before and after Send.',
  rationale:
    'The user chose option D of decision 211 and option D of decision 212 on 9 November 2026. A message keeps the plain link, which holds the ID of the workspace, so the agent reads the link, and the label can change later. The chip shows the state of now, which matters when one workspace waits for another. The chat finds each workspace in the list of the org, with the archived ones, so a phone shows the same chips without a list on the screen. The number shows only in the header and in chips, so the rows of the list keep their layout. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'link-answer',
    banner: 'checks-running',
  },
  useCasePaths: ['user-flows/link-a-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

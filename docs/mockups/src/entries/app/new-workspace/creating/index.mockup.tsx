import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/create-workspace']

export const creating = defineScreen({
  title: 'Creating',
  description:
    'The first message created the workspace. It opened at once as Untitled, on the branch calummoore/lisbon-7k2q, and joined General. About a second later it took the title Saved carts from that message, and its session tab took the same title. Its sandbox starts from the newest good build of the cloud computer of the org, the chat shows each step of the start, and the message waits until the sandbox is ready. Under the steps, a note says that each start has a 20-minute limit.',
  rationale:
    'The user chose option C of decision 184 on 8 November 2026. When the app accepts the first message, it asks a small model that the operator runs for a title of three to five words from that message. The title comes in about a second, so the name shows during the start. The request does not use the agent login of the member, and the chat shows nothing of it. The user chose option G of decision 182 and option B of decision 185 on 9 November 2026. A new workspace and each new session have no name, and show Untitled. An automatic name fills only an empty name, so a name that a member set never changes. The branch keeps the city name. The first session takes the same title as the workspace, as the user chose in decision 181.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued',
    banner: 'no-commits',
  },
  useCasePaths: [...flow, 'user-flows/create-workspace-dialog'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'first-second',
      title: 'First second',
      description:
        'The user just sent the first message. The workspace opens at once and joins General. It has no name yet, so the list, the header, and its session tab show Untitled. Its branch has a city name, calummoore/lisbon-7k2q. The start shows its first step. About a second later, the title from the first message takes the place of Untitled.',
      rationale:
        'If the request for the title fails, the workspace stays Untitled, and the next message with text asks again. A first message with no text, such as only a screenshot, leaves the workspace Untitled in the same way. The chat shows nothing of the request or its failure.',
      props: { name: 'untitled' },
      useCasePaths: flow,
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/open-a-session-link']

export const sentBy = defineScreen({
  title: 'Sent by an agent',
  description:
    'In Checkout address autocomplete, the agent of the second session, Debounce the address lookups to 250 ms, sent a message to the first session, Address autocomplete. The message shows as a message of Cal, whose message started the turn of that agent. Its text ends with a blank line, a line of three dashes, and a line that starts with "Sent by:". The app adds these lines. The link of the sending session in the last line shows as a session chip: the state mark and the label of the workspace, the icon of a session tab, and the title of the session. The message starts a turn, and the agent of Address autocomplete works on it. A press on the chip shows the second session. The variant shows a message from a session of another workspace.',
  rationale:
    'The user chose option D of decision 257 and option C of decision 259 on 10 November 2026. The lines come at the end of the text, so the first line of a first message still gives the title of its session. The lines are plain text, as the facts at the end of the first message of a routine run are, so the agent of the session reads them too. A member can type the same lines, so they prove nothing. The message goes in the name of the member whose message started the turn of the sending agent, so the agent login and the GitHub token of that member serve the turn. A message from an agent follows the rules of every message: it starts a turn in an idle session, and it joins a running turn, as the variant shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'sent-by',
    banner: 'checks-running',
  },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'other-workspace',
      title: 'From another workspace',
      description:
        'In Saved carts, the agent works on the first message. The same agent of Checkout address autocomplete sent it a message, which joined the running turn as a new part. Its chip shows W-395, the label of the other workspace, with the state mark of that workspace. The message also names a closed session of W-395, whose long title the chip cuts short. A press on that chip opens Checkout address autocomplete on its workspace page, because the session is closed. A press on the chip of the last line shows the sending session.',
      rationale:
        'The chat reads the sessions of each linked workspace when it loads, open and closed, so a chip shows the title of a session of another workspace. That title does not change live, but the state mark shows the live state of the workspace, as on a workspace chip. A press on the chip of a closed session reopens no tab, because the tabs of a workspace are the same for every member. The closed session stays in the session history of its workspace.',
      props: {
        workspace: 'saved-carts',
        conversation: 'sent-by-other',
        banner: 'no-commits',
      },
      useCasePaths: flow,
    },
  ],
})

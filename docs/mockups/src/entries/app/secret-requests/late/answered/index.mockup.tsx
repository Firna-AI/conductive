import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

const flow = ['user-flows/secret-request']

export const lateAllowed = defineScreen({
  title: 'Allowed later',
  description:
    'Priya opened the workspace later and allowed the request of Cal. Cal sees the widget say Allowed for this session, and its line says that Priya answered and that a new turn told the agent. A line of the app follows at the end of the chat: "Priya Raman allowed PROD_DATABASE_URL for this session." It is not a message of Priya. The new turn runs for Cal.',
  rationale:
    'Secrets decision 10 B: a late answer starts a turn that acts for the sender of the turn that asked, under the login rules of that sender. So the answer of any member reaches the agent on the login that the asking turn used. The chat and the text that the agent gets name the member who answered, and never a value.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-late-allowed' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'ran',
      title: 'The new turn runs',
      description:
        'The agent of the new turn runs the script again. The session has the approval, so no card asks. The tool call line of the agent says Running, and the card says "Allowed for this session by Priya Raman" under the command that the agent says it will run.',
      props: { conversation: 'secret-late-ran' },
      useCasePaths: flow,
    },
    {
      slug: 'fallback',
      title: 'The turn cannot run',
      description:
        'Priya sent the question while Cal let other members use his login, and Cal stopped that later. Cal allowed the late request. The turn would act for Priya on the login of Cal, which no longer serves her messages, so the app sends nothing. The widget says Allowed for this session, and its line says that the agent learns of the answer at the next message. No line and no turn follow.',
      rationale:
        'Secrets decision 10 B: when the turn of a late answer cannot run, because the starter does not share the login with the sender of the turn that asked, or the login is gone, the app sends nothing. The approval stays, so the next message of the session finds it.',
      props: { conversation: 'secret-late-fallback' },
    },
    {
      slug: 'login-gone',
      title: 'The login of the starter is gone',
      description:
        'Cal removed his Claude login, so the turn for Cal cannot run. Priya allowed the late request. The widget says Allowed for this session, and its line says that the agent learns of it when Cal connects Claude again. No line and no turn follow. A message of Priya would start a new session, as the notice over her composer says.',
      rationale:
        'Item 12 C of the mockups: when the login of the starter is gone, the next message of another member opens a linked session (decision 115 A), so the line names the one action that gets the agent going again. When the starter only stopped sharing the login, the line keeps "at the next message", as the fallback variant shows.',
      props: {
        conversation: 'secret-late-reconnect',
        viewer: 'member',
        composer: 'no-starter-login',
      },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/secret-request']

export const lateRequest = defineScreen({
  title: 'Late request',
  description:
    'Nobody answered PROD_DATABASE_URL within 90 seconds. The tool call ended without a run, the agent said that it waits for a member, and the turn ended. The card left the composer and stays as a widget at its place in the chat, with Deny and Allow for this session. Its line says that the agent stopped waiting and that Allow sends it a message. The work before it folds, and the widget stays in view. The workspace keeps Needs input.',
  rationale:
    'Each request of a tool call waits at most 90 seconds, because Claude stops a shell command after 2 minutes by default. The result of the call tells the agent that the request stays open and that a message follows an answer. A request whose turn ends while the call waits becomes a late request in the same way. Decision 68 keeps needs input while any request waits. The widget does not fold into the work of its turn, so a member finds it.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-late' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'answered',
      title: 'Allowed later',
      description:
        'Cal came back and allowed the request. The widget now says Allowed for this session, and its line says that a message from him told the agent. His message follows at the end of the chat: "PROD_DATABASE_URL is now available in this session." It starts a new turn.',
      rationale:
        'A late answer sends a message in the session in the name of the member who answered, as a typed message does. It starts a new turn, or joins a running turn as other messages do. The message names each secret and never holds a value.',
      props: { conversation: 'secret-late-allowed' },
      useCasePaths: flow,
    },
    {
      slug: 'ran',
      title: 'The new turn runs',
      description:
        'The agent of the new turn runs the script again. The session has the approval, so no card asks, and the run says "Allowed for this session by you", with its output.',
      props: { conversation: 'secret-late-ran' },
      useCasePaths: flow,
    },
    {
      slug: 'denied',
      title: 'Denied later',
      description:
        'Cal denied the late request. The widget says Denied, and its line says that he denied it. No message follows, and the workspace no longer needs input.',
      rationale:
        'A late deny sends no message, because the call of the agent already ended and the agent waits for nothing.',
      props: { conversation: 'secret-late-denied' },
    },
    {
      slug: 'not-answered',
      title: 'Not answered',
      description:
        'Cal archived the workspace while the late request waited. The request ended as Not answered, with no choices, and its line says that it ended when the workspace was archived. The workspace shows Archived, not Needs input. A suspension of the org ends each open request in the same way, and its line names the suspension.',
      rationale:
        'Item 3 A of the mockups: an archived workspace and a suspended org run no turn, so an answer could not reach the agent. Each open request ends as Not answered, and Needs input ends. Restore does not bring the request back.',
      props: { conversation: 'secret-late-archived', sandbox: 'archived' },
    },
  ],
})

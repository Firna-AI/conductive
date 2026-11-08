import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const composer = defineScreen({
  title: 'Composer',
  description:
    'A message with two uploaded files. The paperclip uploads files, which show as chips above the text, and Send takes the message with its files. The Attachments page shows an upload that runs or fails, a file over the size limit, and sent files. One picker sets the model and the effort of the next message, such as "Opus 5.5 High". The line under the box names the agent login that the session uses.',
  rationale:
    'The picker names the model and shows the effort in a muted colour, without the names of the agents, so it stays short. The app offers the Claude and Codex models only for now. Each session has its own picker, as the user chose in decision 19. The app stores each file until the turn starts, then copies it into the cloud computer, and an image also goes to the model. Every composer uses the same controls, also the one of a new workspace.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'attachments' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'picker',
      title: 'Model and effort',
      description:
        'The open picker: the Claude models and the Codex models in two groups, with no brand names, then the effort levels of the chosen model. It marks Opus 5.5 and High. This session runs Claude, so each Codex model says New session, and a note says that the draft moves there.',
      rationale:
        'The user chose option B of decision 51: a model of the same agent stays in the session, and a model of the other agent opens a new session with the draft, as in Conductor. A Claude session and a Codex session keep separate memory, so the switch cannot stay in one session.',
      props: { composer: 'picker' },
    },
    {
      slug: 'no-agent',
      title: 'Agent not connected',
      description:
        'Claude is not connected, for example because the user removed its login, so the message for Opus 5.5 waits and Send is off. The notice over the composer leads to the account, with the Connect form of Claude open.',
      rationale:
        'The user chose option D of decision 33: Get started connects an agent, and this notice catches an agent that is not connected later. Picking a model of a connected agent also lets the message go.',
      props: { composer: 'no-agent' },
    },
    {
      slug: 'login',
      title: "Another member's login",
      description:
        'Priya, a member of Acme, opens a session that Cal started. The line under the composer box says "Uses Cal\'s Claude login". So a message of Priya spends the login of Cal, also while a turn runs. In a session of Priya, the line says "Uses your Claude login".',
      rationale:
        'The user chose option F of decision 105 on 7 November 2026. Each session runs on the login of its starter, the member who started it. A message of any member uses that login. A message during a turn joins that turn at once. Every composer of a session names the login, so each member sees whose login a message spends. The message needs no Claude login of Priya, so the composer shows no Connect notice.',
      props: { viewer: 'member' },
    },
  ],
})

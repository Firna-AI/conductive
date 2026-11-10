import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const composer = defineScreen({
  title: 'Composer',
  description:
    'A message with two uploaded files. The paperclip uploads files, which show as chips above the text, and Send takes the message with its files. The Attachments page shows an upload that runs or fails, a file over the size limit, and sent files. One picker sets the model and the effort of the next message, such as "Opus 5.5 High". The user started the session, so the bar names no login.',
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
        'Claude is not connected, for example because the user removed its login, so the message for Opus 5.5 waits and Send is off. The notice over the composer leads to the account, with the Connect form of Claude open. A member without a Claude login sees the same notice in a session of another member whose login is not available or not shared, because the message would start a new session on the login of that member.',
      rationale:
        'The user chose option D of decision 33: Get started connects an agent, and this notice catches an agent that is not connected later. Picking a model of a connected agent also lets the message go.',
      props: { composer: 'no-agent' },
    },
    {
      slug: 'login',
      title: "Another member's login",
      description:
        'Priya, a member of Acme, opens a session that Cal started, while the turn of Cal runs. Cal turned on the switch that lets other members use the Claude login. The bar of the composer box says "Cal\'s login" after the model picker. So a message of Priya spends the login of Cal, and it joins the running turn. On a phone the bar is full, so the effort of the picker gives way first, then the name, each with an ellipsis. In a session of Priya, the bar names no login.',
      rationale:
        'The user chose option F of decision 105 on 7 November 2026. Each session runs on the login of its starter, the member who started it. A message of any member uses that login. A message during a turn joins that turn at once. The composer names the login of another member, so each member sees when a message spends that login. As the user decided on 8 November 2026, the name sits in the bar, so the box keeps its place, and the own login gets no name, because it tells the user nothing new. The message needs no Claude login of Priya, so the composer shows no Connect notice. When Cal keeps the login for the messages of Cal, the composer says before Send that the message starts a new session, as the Login not shared state shows.',
      props: { viewer: 'member', conversation: 'running' },
    },
    {
      slug: 'not-shared',
      title: 'Login not shared',
      description:
        'Cal started Address autocomplete, and the switch under the Claude login of Cal is off. The turn of Cal runs. Priya opens the session and writes a message. The notice over the composer says that the message starts a new session, because the Claude login of Cal is for the messages of Cal only. The bar names no login, because the message runs on the own login of Priya. Stop still ends the turn of Cal, and the message does not steer it. Send opens the new session, as app/sessions/linked shows.',
      rationale:
        'Option B of decision 116, which the user chose on 7 November 2026: each login has a switch that lets other members use it, off for a Claude subscription and on for an API key. A message of another member in a session whose starter keeps the login starts a new, empty session on the login of that member, as decision 115 A says. The session record says whether the starter shares the login, so the notice shows before Send. When Priya has no Claude login, the notice that asks to connect takes its place, as the Agent not connected state shows, and Send is off. Cal sees no notice in this session, because it runs on the own login of Cal.',
      props: {
        viewer: 'member',
        composer: 'not-shared',
        conversation: 'running',
        banner: 'none',
      },
    },
  ],
})

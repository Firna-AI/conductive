import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const notStartedWakeUp = defineScreen({
  title: 'A wake-up that could not start',
  description:
    'Cal removed his Claude login, so at its time the wake-up of the checks could start no turn. Its card left the footer, and a line takes its place in the chat. Priya reads it in her local time: "The wake-up for today at 10:00 could not start. The agent can go on after Cal connects Claude again." A message of Priya would start a new session, as the notice over her composer says.',
  rationale:
    'Cal chose B of wake-up decision 4 on 23 November 2026: a wake-up that reached its time and can start no turn becomes a line that says that it could not start, and names the action that gets the agent going again, as a late secret request does. The wake-up ended, so the line says that the agent "can go on" after that action, and not that it goes on by itself. The time names the wake-up, because the chat shows no times.',
  relatedDocs: ['docs/protocol/secret-late-answers.md'],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'wake-up-reconnect',
    viewer: 'member',
    composer: 'no-starter-login',
    banner: 'none',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'org-login',
      title: 'The org login is gone',
      description:
        "Cal started the session on the Claude login of Acme, and an admin of Acme removed that login. The line says that the agent can go on after an admin connects Acme's Claude login again. It names no member, because only an admin connects an org login.",
      props: { conversation: 'wake-up-reconnect-org', login: 'org' },
    },
    {
      slug: 'next-message',
      title: 'The sender left the org',
      description:
        'Jonas sent the message whose turn set the wake-up, and then left Acme. The turn of a wake-up acts for its sender, so it could start no turn. Cal reads: "The wake-up for today at 09:00 could not start. The agent can go on at the next message." A message of Cal runs on his own login, which the session keeps. The line is the same when the starter no longer shares the login with the sender.',
      rationale:
        'A late secret answer says "at the next message" in the same two cases. The line names no member who left the org, as a stop line names none.',
      props: {
        conversation: 'wake-up-next-message',
        viewer: 'admin',
        composer: 'empty',
      },
    },
    {
      slug: 'closed',
      title: 'A closed session',
      description:
        'Cal closed the tab of the session while the wake-up waited, and opened it again from the session history after 09:00. At its time the wake-up could start no turn. The line says that it could not start, because the session was closed. The composer of the open session is ready.',
      props: {
        conversation: 'wake-up-closed',
        viewer: 'admin',
        composer: 'empty',
      },
    },
    {
      slug: 'archived',
      title: 'An archived workspace',
      description:
        'Cal archived the workspace while the wake-up waited, and it was still archived at 09:00. The chat, which is read-only now, shows that the wake-up could not start, because the workspace was archived. The bar offers Restore.',
      rationale:
        'An archived workspace starts no turn. A Restore before the time of a wake-up keeps it, because the wake-up ends only at its time.',
      props: {
        conversation: 'wake-up-archived',
        viewer: 'admin',
        composer: 'empty',
        sandbox: 'archived',
      },
    },
  ],
})

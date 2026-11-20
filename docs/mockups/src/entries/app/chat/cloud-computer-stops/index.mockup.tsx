import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const cloudComputerStops = defineScreen({
  title: 'Stopped by the cloud computer',
  description:
    'The cloud computer stopped during the end-to-end run, and no member and no part of the app asked for the stop. The turn ends as stopped: the call that the stop cut off shows as stopped, and the stopped line says "The cloud computer stopped". A line of the app under it says that the agent continues when the cloud computer starts again. The app started it again, and a continuation turn ran for Cal, who sent the message of the stopped turn. The agent ran the end-to-end tests again, opened pull request #482, and replied. That turn ends as finished, with its duration and the one file that it changed. The message that told the agent to continue does not show in the chat.',
  rationale:
    'The user chose C of decision 1 and B of decision 2 of the continuation plan on 20 November 2026: after such a stop during a turn, the app ends the turn with its own line, starts the cloud computer again, and starts a continuation turn for the sender of the stopped turn. The stopped line names the cause in place of "The agent stopped". The line of the app names only what comes next, because the stopped line right above it names the cause. It never says that the cloud computer started before it did. A stop that a member asked for keeps its own line, such as "You stopped the agent", and gets no continuation turn.',
  relatedDocs: [
    'docs/protocol/messages-and-attachments.md',
    'docs/protocol/stop-and-resume.md',
    'docs/protocol/background-work.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'cloud-computer-continued',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'login-gone',
      title: 'The login of the starter is gone',
      description:
        'Cal removed his Claude login while the agent worked, so a continuation turn for Cal cannot run, and the app starts none. Priya sees the stopped turn, and the line of the app says that the agent can continue after Cal connects Claude again. A message of Priya would start a new session, as the notice over her composer says. Priya opened the workspace later, and the open started the cloud computer again, as each open of a stopped workspace does.',
      rationale:
        'A continuation turn acts for the sender of the stopped turn, under the login rules of a late answer to a secret request. When that sender can no longer use the login, the app starts no turn. The line then names who connects the login again, with the words of the line of a late answer. It says "can continue", because the reconnect starts no turn by itself. Cal reads "after you connect Claude again".',
      props: {
        conversation: 'cloud-computer-login-gone',
        banner: 'none',
        viewer: 'member',
        composer: 'no-starter-login',
      },
    },
    {
      slug: 'org-login-gone',
      title: 'The org login is gone',
      description:
        "Cal started Address autocomplete on the Claude login of Acme, and an admin of Acme removed that login while the agent worked. So the app starts no turn after the stop. The line of the app says that the agent can continue after an admin connects Acme's Claude login again. A message of Priya would start a new session, as the notice over her composer says.",
      rationale:
        'A session keeps its login, and only an admin connects the org login again. So the line names that action and no member, as the line of a late answer does.',
      props: {
        conversation: 'cloud-computer-org-login-gone',
        banner: 'none',
        viewer: 'member',
        composer: 'no-starter-login',
        login: 'org',
      },
    },
    {
      slug: 'stopped-again',
      title: 'Stopped again within 15 minutes',
      description:
        'The cloud computer stopped the continuation turn a few minutes after its start. The app starts no further continuation turn and no cloud computer. The second stopped line also says "The cloud computer stopped", and the line of the app under it says "Send a message to continue". The end of the 30 days of a chain of continuation turns gives the same line. Cal opened the workspace later, and the open started the cloud computer again, so the composer is ready.',
      rationale:
        'The user chose E of decision 3 of the continuation plan on 20 November 2026: no count limit, a limit of 30 days from the newest message of a member, and no further continuation after a continuation turn that stopped in less than 15 minutes. Code on the cloud computer can stop it again and again, and each stop would otherwise start a new turn. A message of a member starts a new chain.',
      props: { conversation: 'cloud-computer-stopped-again', banner: 'none' },
    },
  ],
})

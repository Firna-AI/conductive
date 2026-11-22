import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const restart = defineScreen({
  title: 'Restart the software of a workspace',
  description:
    'The header state of a ready workspace is a button. It opens a menu with Restart, and a note says that Restart restarts the agents and the port previews and installs updates, and that services keep running. On a phone the menu is a sheet.',
  rationale:
    "Cal asked on 16 November 2026 for a header state that opens a menu with a restart. Cal chose that Restart restarts the agent runner and the preview relay in the running cloud computer, and keeps the shells of the terminals. An open terminal tab disconnects until the agents are back, and offers Reconnect. Cal also chose that Restart first downloads the newest software, with a time limit. Every member of an org that is not suspended can restart. Starting, Stopped, Couldn't start, and Archived show the state as plain text. The services of app/tools/services run outside the agent runner, so Restart keeps them running, from services decision 19 A of 20 November 2026. The commands that agents started under the runner end with it.",
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, overlay: 'restart' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'confirm',
      title: 'Restart while an agent works',
      description:
        'An agent works when the member presses Restart. A question says that Restart stops its turn and the commands that agents started, and that services and the commands in the terminals keep running. Cancel keeps the agent working.',
      rationale:
        'A close of a session with a running turn asks first too. A restart is a main way out of a stuck turn, so the question does not refuse the restart.',
      props: { overlay: 'restart-confirm', conversation: 'running' },
    },
    {
      slug: 'restarting',
      title: 'After Restart',
      description:
        'The header and the row show Starting until the agents are back. The chat stays, and the composer takes a message for later.',
      props: { overlay: 'restarting' },
    },
    {
      slug: 'update-check-failed',
      title: 'The update check failed',
      description:
        'The cloud computer could not check for updates in time. A toast says so, and the restart goes on with the installed software.',
      props: { overlay: 'restart-update-failed' },
    },
    {
      slug: 'failed',
      title: 'The restart failed',
      description:
        "The agents did not come back within 3 minutes, or the restart command failed. The workspace shows Couldn't start, with its message and Try again.",
      props: { overlay: 'none', sandbox: 'error', startError: 'restart' },
    },
  ],
})

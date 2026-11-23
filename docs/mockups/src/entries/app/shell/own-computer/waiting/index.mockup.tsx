import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { computerPaths } from '../../../../../computerPaths'
import { ownComputerPages } from '../../../../../screens/ownComputerPages'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const ownComputerWaiting = defineScreen({
  title: 'Waiting for the computer',
  description:
    'Checkout address autocomplete resumes on lab-server, which is offline. The start shows one step, Waiting for lab-server to connect, with its time. The workspace starts when lab-server connects. Resume on the bar of a workspace that stopped after lab-server went offline leads here. So does Try again after the start failed at the limit. Its stopped-turn variant keeps the chat of a turn that stopped.',
  rationale:
    'A start on an offline own computer waits for it until the 20-minute limit of a start, as the design calls of the plan say. The stop rule stays. A resume after the computer went offline waits in the same way (own computer decision 10 B). Moved here from a variant of app/shell/own-computer, with the same path, so that the page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: ownComputerPages[computerPaths.workspace.waiting],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'stopped-turn',
      title: 'Waiting, after a stopped turn',
      description:
        'The same wait for lab-server after Resume on the workspace that went offline during a turn. The chat keeps the turn that stopped, with "The agent stopped", and no pull request bar shows, as on that page.',
      rationale:
        'Resume changes only the start of the sandbox and its computer. Every other part of the workspace stays, also its chat (review finding 2, 23 November 2026).',
      props: ownComputerPages[computerPaths.workspace.waitingStoppedTurn],
    },
  ],
})

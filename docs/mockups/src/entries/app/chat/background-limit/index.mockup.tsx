import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const backgroundLimit = defineScreen({
  title: 'Background work at the time limit',
  description:
    'The member asked the agent to merge its pull request when the checks pass. The agent opened pull request #482, watched its checks with a command in the background, and ended its reply. The turn waited for that work, and the checks still ran at the time limit. So the turn ends as finished, with "Background work stopped at the time limit" above its duration and its files. The bar still shows the checks that run, and the composer is ready.',
  rationale:
    'The user chose C of decision 1, C of decision 2, and F of decision 3 on 11 November 2026: a turn waits for the background work of the agent for up to 120 minutes, and at the limit it ends with an end reason. The turn finished, so it keeps its duration and its files, which a stopped turn does not show. The line names what stopped, not the number of the limit, because the member cannot change it. It has the centred, muted style of the other event lines, such as "You stopped the agent", and sits close to the row of the duration, so the two read as one end.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'background-limit',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'waiting',
      title: 'While background work runs',
      description:
        'The agent ended its reply, and its watch of the checks still runs. The turn stays open and shows as any running turn: its work, its answer, Working with the time since the turn started, and Stop beside Send.',
      rationale:
        'The user chose F of decision 3, which adds no display for the wait. A line in the running turn that names the work and a workspace state for the wait were left out. The line of the background call shows as done, because the call returns at once.',
      props: { conversation: 'background-waiting' },
    },
  ],
})

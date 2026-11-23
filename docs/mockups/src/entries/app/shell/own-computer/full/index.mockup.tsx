import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { computerPaths } from '../../../../../computerPaths'
import { ownComputerPages } from '../../../../../screens/ownComputerPages'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const ownComputerFull = defineScreen({
  title: 'Waiting for a free place',
  description:
    'Checkout address autocomplete resumes on build-02, which runs 4 of its 4 workspaces. The start shows one step, Waiting for a free place on build-02, with its time. The workspace starts when one of the workspaces there stops.',
  rationale:
    'Cal chose option B of own computer decision 9 on 23 November 2026: a start on a full own computer waits for a free place. At the 20-minute limit of a start, it fails with Try again, as a start on an offline computer does. One rule then covers each start that waits for its computer. Not chosen: A, refuse the start at once. C, a queue with no time limit.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: ownComputerPages[computerPaths.workspace.full],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Full at the start limit',
      description:
        'No place came free on build-02 within the 20-minute limit of a start. The bar of the failed start shows the saved message, which says that build-02 is full and names the limit. The bar says that the files and the chat are saved, and offers Try again, which leads to a new wait for a free place.',
      rationale:
        'Cal added one rule to option B of own computer decision 9 on 23 November 2026. The message of a failed start says that the computer is full. It also names the computer and the 20-minute limit of a start, as the message of a start that waited for an offline computer does. It gives no count of workspaces, because the count can change before a member reads it.',
      props: ownComputerPages[computerPaths.workspace.fullFailed],
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const hiddenDesktop = defineScreen({
  title: 'Hidden Desktop',
  description:
    'The live desktop of the sandbox, where the agent uses a browser. The app hides Desktop. No tab or palette action opens this view, so no tab shows as selected. This page keeps the design of the view for the return of Desktop.',
  rationale:
    'The user chose to hide Desktop from every user while its stream is not reliable. The app keeps its implementation for its return. The tools offer Terminal and Preview.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'desktop',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

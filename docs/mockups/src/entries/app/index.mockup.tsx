import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../screens/workspaceState'

export const app = defineScreen({
  title: 'App',
  description:
    'A ready workspace: the finished chat, the changed files, and a pull request that is ready to merge.',
  rationale:
    'Desktop keeps the chat beside a right column: the pull request bar on top, the files and checks below it, and the tools at the bottom, so the user sees the files change while the agent works. A phone has no room for both, so tabs switch between the chat, the files, and each tool.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: readyWorkspace,
  useCasePaths: ['user-flows/reopen-stopped-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

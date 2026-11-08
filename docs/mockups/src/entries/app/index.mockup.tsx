import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../screens/workspaceState'

export const app = defineScreen({
  title: 'App',
  description:
    'A ready workspace with two agent sessions and one open file: the finished session, the changed files, and a pull request that is ready to merge.',
  rationale:
    'The centre column holds the tabs: each session, and each open file or diff. The right column keeps the pull request bar on top, the file lists and checks below it, and the tools at the bottom, so the user sees the files change while the agent works. A phone has no room for both, so tabs switch between the chat, the files, and each tool.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: readyWorkspace,
  useCasePaths: ['user-flows/reopen-stopped-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const appShell = defineScreen({
  title: 'App shell',
  description:
    'The workspace list of an org, in the sections that the user made. On mobile it is the home screen, under an org switcher. On desktop it is the sidebar beside the org rail, and the main area waits for a choice.',
  rationale:
    'Each row is one line: a small dot-matrix square for the state, the name, and the time since the last activity. Each state has its own shape: a light that circles while the agent works, a full square for output that the user has not read, a centre dot when ready, a filling row while starting, a pause sign when stopped, and a cross when the sandbox did not start. Unread output also makes the name bold. Sections are groups that the user makes, not repositories, so one section can hold workspaces of several repositories. Opening a stopped workspace resumes its sandbox.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'none', palette: 'closed' },
  useCasePaths: [
    'user-flows/accept-invitation',
    'user-flows/create-workspace',
    'user-flows/reopen-stopped-workspace',
    'user-flows/open-workspace-from-palette',
    'user-flows/create-org',
  ],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})

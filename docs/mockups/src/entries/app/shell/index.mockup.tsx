import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const appShell = defineScreen({
  title: 'App shell',
  description:
    'The workspace list, grouped by repository, with the state of each sandbox. On mobile it is the home screen. On desktop it is the sidebar, and the main area waits for a choice.',
  rationale:
    'Each row is one line: the name, the state, and the time since the last activity. A running agent makes the row bold, a stopped sandbox dims it with a pause mark, and screen readers hear each state. Opening a stopped workspace resumes its sandbox.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces' },
  useCasePaths: [
    'user-flows/create-workspace',
    'user-flows/reopen-stopped-workspace',
  ],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'first-run',
      title: 'First run',
      description:
        'No repository yet. The one action adds a repository, which prepares its base.',
      props: { list: 'first-run' },
    },
  ],
})

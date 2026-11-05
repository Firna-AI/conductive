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
    'Each row shows a status dot and a label, so the state never depends on colour alone. Opening a stopped workspace resumes its sandbox.',
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

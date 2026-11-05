import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const newOrg = defineScreen({
  title: 'New org',
  description:
    'The org that Create org made, before its first workspace. The rail selects it, its sidebar shows the default section, and New workspace starts the first workspace.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'new-org', menu: 'none' },
  useCasePaths: ['user-flows/create-org', 'user-flows/sign-up'],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const newOrg = defineScreen({
  title: 'New org',
  description:
    'Firna, the org that the first run made, before its first workspace. The rail selects it, its sidebar shows the default section, and New workspace starts the first workspace. New workspace opens app/new-workspace/first-build, which waits for the first build of the cloud computer of Firna.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'new-org', menu: 'none' },
  useCasePaths: ['user-flows/sign-up'],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'another',
      title: 'Another new org',
      description:
        'Acme Labs, which Create org made beside the orgs of the user. The rail adds it and selects it.',
      movedFrom: 'app/orgs/empty/team',
      props: { list: 'another-org' },
      useCasePaths: ['user-flows/create-org'],
    },
  ],
})

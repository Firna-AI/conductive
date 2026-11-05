import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const newOrg = defineScreen({
  title: 'New org',
  description:
    'Firna, the free org that the first run made, before its first workspace. The rail selects it, its sidebar shows the default section, and New workspace starts the first workspace.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'new-org', menu: 'none' },
  useCasePaths: ['user-flows/sign-up'],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'team',
      title: 'New org on Team',
      description:
        'Acme Labs, back from Stripe Checkout: Create org made it on Team, because its owner already owns a free org. The rail adds it and selects it.',
      props: { list: 'new-team-org' },
      useCasePaths: ['user-flows/create-org'],
    },
  ],
})

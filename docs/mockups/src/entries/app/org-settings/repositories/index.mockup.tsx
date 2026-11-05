import { defineScreen } from '@mokly/mokly'
import {
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const repositories = defineScreen({
  title: 'Repositories',
  description:
    'The repositories that the org bundles into its cloud computer, chosen from those that the shared GitHub App can reach. A change takes effect at the next build of the computer.',
  rationale:
    'Repositories keep their own tab, as the user asked. Waits on decisions 10 and 21, drawn as their recommended options at org level: the user chooses the repositories of the org, from one GitHub App that every org shares.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { tab: 'repositories', build: 'ready' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const suspendedOrgSettingsComputers = defineScreen({
  title: 'Own computers',
  description:
    'The own computers of Acme under the notice of the suspended org, also for Cal, an admin: the rows with their states, and no Add computer. No workspace of the org runs, so each computer runs none. The rows open no page.',
  rationale:
    'A suspension takes away no read, and it refuses every start and every change. So the tab shows the own computers read-only to everyone, as the other tabs do.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: {
    ...acmeSettings,
    org: 'suspended',
    tab: 'own-computers',
    ownComputers: 'before-add',
  },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

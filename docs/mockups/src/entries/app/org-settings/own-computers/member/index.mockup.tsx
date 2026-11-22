import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const memberComputers = defineScreen({
  title: 'Seen by a member',
  description:
    'The Own computers tab as Priya, a member who is not an admin, sees it. She reads the same rows, with their states and their workspaces, and the intro says that only an admin can change them. The tab has no Add computer. The name of build-01 opens its page as she reads it, without its limit and without Remove computer.',
  rationale:
    'Own computer decision 2 A lets only admins add, set the limit of, and remove own computers. Members still choose an own computer in New workspace, so they see which computers the org has, and their states.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: {
    ...acmeSettings,
    tab: 'own-computers',
    ownComputers: 'list',
    viewer: 'member',
  },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

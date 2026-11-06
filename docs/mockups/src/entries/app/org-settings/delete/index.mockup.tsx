import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const deleteOrg = defineScreen({
  title: 'Delete org',
  description:
    'Delete org, from the General tab: the dialog says that every cloud computer stops now, that members can no longer open the org, and the date when everything is deleted. The admin types the org name to confirm. On a phone it is a sheet.',
  rationale:
    'The user chose option D of decision 30 on 5 November 2026: Delete org stops every machine and hides the org at once, and deletes everything after 7 days unless an admin restores it, so members can push their work first. Typing the name guards against a delete by mistake. After the delete, the org shows its restore page.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, dialog: 'delete-org' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

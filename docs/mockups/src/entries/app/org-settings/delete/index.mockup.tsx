import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const deleteOrg = defineScreen({
  title: 'Delete org',
  description:
    'Delete org, from the General tab: the dialog says that every cloud computer stops now, that members can no longer open the org, the date when everything is deleted, and that an admin restores it from Account settings. The admin types the org name to confirm. On a phone it is a sheet.',
  rationale:
    'The user chose option D of decision 30 on 5 November 2026: Delete org stops every machine and hides the org at once, and deletes everything after 7 days unless an admin restores it, so members can push their work first. Typing the name guards against a delete by mistake. On 12 November 2026 the user asked for deleted orgs to leave the rail and for Restore to move to the Account page, as app/account/deleted-orgs shows. So after the delete, the app opens the next org that is not deleted, else Get started, and the dialog says where Restore is.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, dialog: 'delete-org' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

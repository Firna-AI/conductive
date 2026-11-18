import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const accountDeletedOrgs = defineScreen({
  title: 'Deleted orgs',
  description:
    'Cal deleted Acme Labs, so the rail no longer shows it. The last section of the General tab, Deleted orgs, lists it with its faded tile, the day when everything is deleted, and Restore. Restore puts Acme Labs back in the rail, and the section goes away with its last org. The section shows only while the user has a deleted org, so app/account has none.',
  rationale:
    'On 12 November 2026 the user asked for deleted orgs to leave the rail, because the faded tiles stayed in the way after a delete, and for Restore to move to the Account page. This replaces the rail part of option D of decision 30. A deleted org is about the user, not about an open org, so it sits on the account, beside what spans all orgs. Only admins see a deleted org, as before. The address of a deleted org keeps its page with Restore, as app/orgs/deleted shows, so an old link still works.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, deletedOrgs: 'restorable' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'suspended',
      title: 'Suspended',
      description:
        'The operator suspended Acme Labs after its delete. Its row says that it is suspended, so it cannot be restored, and keeps the day when everything is deleted. It offers no Restore.',
      rationale:
        'A suspended org refuses a restore, as it refuses each change but a leave, so the row shows no action that the org refuses. The delete still goes on, so the row keeps its day.',
      props: { deletedOrgs: 'suspended' },
    },
    {
      slug: 'failed',
      title: 'Restore failed',
      description:
        'A Restore of Acme Labs failed. The error shows under its row, and Restore stays, so Cal can try again. The button says Restore, and its name for a screen reader names the org.',
      rationale:
        'The error stays with the org that it is about, as on the page of a deleted org. A failed Restore changes nothing, so the org stays in the section.',
      props: { deletedOrgs: 'failed' },
    },
  ],
})

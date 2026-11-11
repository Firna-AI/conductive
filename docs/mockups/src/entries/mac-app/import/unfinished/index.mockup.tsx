import { defineScreen } from '@mokly/mokly'
import { ConductorImportScreen } from '../../../../screens/ConductorImportScreen'
import {
  conductorImportSchema,
  unfinishedList,
} from '../../../../screens/conductorImportState'

export const macImportUnfinished = defineScreen({
  title: 'Unfinished upload',
  description:
    'A later visit, after the Mac lost its network while it uploaded Check webhook signatures. Coupon totals at checkout had finished, so its row shows its chip, and it is the only workspace in Import from Conductor. Check webhook signatures has no workspace and no box: its row says that 2.1 MB of 6.2 MB went up and that the parts stay until 17 Nov, with Try again. Nothing tries again by itself. The chip, the sidebar row, and the tile of Acme stay static, because the drawn workspace shows both imported workspaces in its list.',
  rationale:
    'The user chose on 10 November 2026 that a stopped upload keeps its reservation and its stored parts, and that the Mac list shows the row as unfinished with Try again, which sends only the missing parts. The reservation is not a workspace, so no member sees it, and it is not in the workspace list. It expires with its parts after 7 days, and the Mac still holds all of the work.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: unfinishedList,
  render: (props) => <ConductorImportScreen state={props} />,
  variants: [
    {
      slug: 'retry',
      title: 'Try again',
      description:
        'Cal chose Try again. The upload of Check webhook signatures continues from the parts that it stored, and sends only the parts that are missing: 4.4 MB of 6.2 MB are up. It is still a plain row, and the sidebar still shows only Coupon totals at checkout, until this upload ends.',
      props: { step: 'retry' },
    },
    {
      slug: 'expired',
      title: 'Expired',
      description:
        'A visit after 17 Nov, when nobody chose Try again in time. The reservation and its parts expired, so the row of Check webhook signatures is a normal row again, with its box and its full size. Its line says that the unfinished upload expired and that Import sends all of it again. Cal selected it, so Import 1 workspace uploads all 6.2 MB from the work that stays on this Mac.',
      rationale:
        'Expired parts are deleted, so nothing of the stopped upload is reused. The work never left the Mac, so the import can start again in full.',
      props: { rows: 'expired', selection: 'one' },
    },
  ],
})

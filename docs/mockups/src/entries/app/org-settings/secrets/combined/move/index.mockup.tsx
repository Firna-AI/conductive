import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Items 2 C, 3 B, and 4 B are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedMove = defineScreen({
  title: 'Proposal: Move to secrets',
  description:
    'Cal chose Move to secrets on STRIPE_SECRET_KEY. The dialog says that cloud computers stop getting the value at their next start, that agents then ask before each use, and that admins can reveal it. Cal becomes the member who added it.',
  rationale: `${open} Item 2 C: an admin moves an env var to the secrets without typing it again, because the browser never gets its value. The value moves in the Worker. Only this direction has Move. The moved secret starts without the mark for all agents.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'move' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

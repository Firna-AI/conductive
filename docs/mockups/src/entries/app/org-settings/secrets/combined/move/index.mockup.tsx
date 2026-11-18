import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  'This page is a proposal for review. Items 1 B, 2 C, 3 B, and 4 B of 17 November 2026 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force.'

export const combinedMove = defineScreen({
  title: 'Proposal: Move to After approval',
  description:
    'Cal chose Move on STRIPE_SECRET_KEY, a value for each start. The dialog asks first. It says that cloud computers stop getting the value at their next start, that agents then ask before each use, and that admins can reveal it. Cal becomes the member who added it.',
  rationale: `${open} Item 2 C: an admin moves a value for each start to After approval without typing it again, because the browser never gets the value of an env var. The value moves in the Worker. Only this direction has Move, so no action widens where a member's secret goes. The moved secret starts without the mark for all agents.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'move' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

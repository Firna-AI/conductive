import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Cal chose item 2 B on 20 November 2026. Items 1, 3, and 4 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedComputer = defineScreen({
  title: 'Proposal: the Cloud computer tab',
  description:
    'The Cloud computer tab of Acme in the proposal. It keeps the build, the install script, and the startup script. It has no env vars.',
  rationale: `${open} Cal asked on 20 November 2026 to remove the env vars from this tab, so Env & secrets is the one place for them. An older Mac app keeps its own env var section, which keeps working.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'computer' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

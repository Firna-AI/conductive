import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  'This page is a proposal for review. Items 1 B, 2 C, 3 B, and 4 B of 17 November 2026 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force.'

export const combinedComputer = defineScreen({
  title: 'Proposal: the Cloud computer tab',
  description:
    'The Cloud computer tab of Acme after the move. It keeps the build, the install script, and the startup script. In the place of the env vars, one line says that values for each start are on the Secrets tab, and links to it.',
  rationale: `${open} One place holds every value, so this tab only points to it. Guides and older links still lead here, and an older Mac app keeps its own env var section, which keeps working.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'computer' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

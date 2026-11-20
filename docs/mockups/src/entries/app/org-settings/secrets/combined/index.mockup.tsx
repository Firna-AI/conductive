import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Items 2, 3, and 4 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedSecrets = defineScreen({
  title: 'Proposal: Env & secrets',
  description:
    'The Env & secrets tab of Acme, as Cal, an admin, sees it. One list holds the env vars and the secrets, sorted by name. Each row shows the name, an Env or Secret badge, and the description of a secret on one line. SENTRY_AUTH_TOKEN also has an All agents badge. Each row has one "⋯" button for its actions. Add opens a compact modal for one value or many.',
  rationale: `${open} Cal asked on 17 November 2026 for one place to define env vars and secrets, and for Rename. On 20 November he named the tab Env & secrets, said that the first draft showed too much, and asked for a modal to add a value. So a row shows only its name, its type, and the description of a secret. Who added a secret, its last reveal, and its marks move to its Edit modal. The rights of each type stay: only admins change env vars (decision 57), and every member adds secrets and changes their own (secrets decision 3 B).`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: acmeValuesState,
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

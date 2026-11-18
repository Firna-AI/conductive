import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../screens/OrgValuesScreen'

const open =
  'This page is a proposal for review. Items 1 B, 2 C, 3 B, and 4 B of 17 November 2026 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force.'

export const combinedSecrets = defineScreen({
  title: 'Proposal: one list of secrets',
  description:
    'The Secrets tab of Acme, as Cal, an admin, sees it, with the env vars and the secrets in one list, sorted by name. Each row shows its kind: Each start, for a value that every cloud computer gets at each start, or After approval, for a value that an agent uses in one command after a member allows it. A row for each start has the switch Hide on screen, Rename, Change, Move to After approval, and Delete. A row after approval keeps its description, who added it, its last reveal, the switch for all agents, Reveal, Rename, Replace, and Delete. One Add secret button opens one form for both kinds.',
  rationale: `${open} Cal asked on 17 November 2026 for one place to define env vars and secrets, in the Secrets tab, and for Rename. Item 1 B keeps both stores, the rights of each kind (decision 57 and secrets decision 3 B), and how each kind reaches a cloud computer, so no data moves and older Mac apps keep working. Item 3 B renames the Secret mark of an env var to Hide on screen, because in one list "Secret" off reads as a value with no protection. A rename keeps the grants and the reveal records of a secret, because they belong to its ID.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: acmeValuesState,
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

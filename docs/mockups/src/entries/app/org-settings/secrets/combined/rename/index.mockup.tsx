import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  'This page is a proposal for review. Items 1 B, 2 C, 3 B, and 4 B of 17 November 2026 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force.'

export const combinedRename = defineScreen({
  title: 'Proposal: Rename a secret',
  description:
    'Cal chose Rename on FIGMA_TOKEN. The form under the row holds the new name, FIGMA_READ_TOKEN. Its hint says that agents that ask for FIGMA_TOKEN stop finding it, that its approvals and reveal record stay, and which characters a name can use.',
  rationale: `${open} Cal asked for Rename on 17 November 2026. A grant belongs to the secret ID, not to its name, so a rename keeps every pre-approval and session approval. The creator of the secret and the admins rename it, as they replace it (secrets decision 3 B). The new name follows the rule of new names. A name that another secret has gets a refusal, as Add secret does. The old name keeps no alias.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'rename' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'each-start',
      title: 'Proposal: Rename a value for each start',
      description:
        'Cal chose Rename on PLACES_API_KEY. The form holds the new name, GOOGLE_PLACES_API_KEY. Its hint says that cloud computers get the new name at their next start, and that scripts that read PLACES_API_KEY stop finding it.',
      rationale:
        'Only admins rename a value for each start (decision 57). The value stays in the Worker and never reaches the browser, so the admin does not type it again. A rename applies at the next start, as a changed value does.',
      props: { view: 'rename-start' },
    },
  ],
})

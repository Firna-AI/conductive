import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Items 2 C, 3 B, and 4 B are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedEdit = defineScreen({
  title: 'Proposal: Edit a secret',
  description:
    'Cal chose Edit in the menu of FIGMA_TOKEN. The modal holds the name, changed to FIGMA_READ_TOKEN, the description, an empty field of a new value, and the switch for all agents. Its last line says who added the secret.',
  rationale: `${open} Edit holds Rename, so a row needs no separate action. A grant belongs to the secret ID, not to its name, so a rename keeps every approval and the reveal record. The name hint says that agents that ask for the old name stop finding it. An empty value keeps the current value, because the browser never gets it. The creator and the admins edit a secret (secrets decision 3 B).`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'edit' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'env',
      title: 'Proposal: Edit an env var',
      description:
        'Cal chose Edit on PLACES_API_KEY. The modal holds the name, changed to GOOGLE_PLACES_API_KEY, an empty field of a new value, and Hide on screen. Its last line says that changes apply at the next start of each cloud computer.',
      rationale:
        'Only admins edit env vars (decision 57). The value stays in the Worker, so a rename does not ask for it again. A rename applies at the next start, as a changed value does.',
      props: { view: 'edit-env' },
    },
  ],
})

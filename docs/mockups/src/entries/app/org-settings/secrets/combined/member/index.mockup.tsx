import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  'This page is a proposal for review. Items 1 B, 2 C, 3 B, and 4 B of 17 November 2026 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force.'

export const combinedMember = defineScreen({
  title: 'Proposal: seen by a member',
  description:
    'Priya, a member who is not an admin, opens the tab. Each value for each start shows its kind and Hide on screen as words, with no action. The secrets that she added have Rename, Replace, and Delete. The note says that only admins add and change values for each start, and that she can change and delete the secrets that she added.',
  rationale: `${open} The rights stay with each kind: only admins change env vars (decision 57), and every member adds secrets and changes their own (secrets decision 3 B).`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, viewer: 'member' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'add',
      title: 'Proposal: Add secret, as a member',
      description:
        'Priya chose Add secret. Her form has no choice of the kind and no switch for all agents, so she adds a secret after approval, as today.',
      props: { view: 'add' },
    },
  ],
})

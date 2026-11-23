import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Cal chose item 2 B on 20 November 2026. Items 1, 3, and 4 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedMember = defineScreen({
  title: 'Proposal: seen by a member',
  description:
    'Priya, a member who is not an admin, opens the tab. She sees the same list. Only FIGMA_TOKEN and VERCEL_TOKEN, the secrets that she added, have the "⋯" button. Add stays.',
  rationale: `${open} The rights stay with each type: only admins change env vars (decision 57), and a member changes only the secrets that they added (secrets decision 3 B).`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, viewer: 'member' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'add',
      title: 'Proposal: Add, as a member',
      description:
        'Priya chose Add. Her modal has no type and no switch for all agents, so she adds a secret, as today.',
      props: { view: 'add' },
    },
  ],
})

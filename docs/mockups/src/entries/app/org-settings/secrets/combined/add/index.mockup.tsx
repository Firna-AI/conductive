import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  'This page is a proposal for review. Items 1 B, 2 C, 3 B, and 4 B of 17 November 2026 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force.'

export const combinedAdd = defineScreen({
  title: 'Proposal: Add secret, for both kinds',
  description:
    'Cal chose Add secret. The form first asks how agents get the value, with After approval chosen and its hint. Then come the name, the description, the value, and the switch for all agents, as Add secret asks today.',
  rationale: `${open} Item 1 B gives one form for both kinds. After approval is first and chosen, because it keeps a value out of every cloud computer until a member allows it. The name follows the rule of new secret names, also for the other kind (item 4 B).`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'add' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'each-start',
      title: 'Proposal: Add secret, for each start',
      description:
        'Cal chose Each start. The hint says that every cloud computer of Acme gets the value at each start, with no question. The form asks for the name and the value, with no description, and ends with the switch Hide on screen, which starts on.',
      rationale:
        'Only admins add a value for each start (decision 57). A new value starts hidden (decision 133), with the new word of item 3 B. An env var has no description or creator in this proposal, because its stored format has neither and it never makes a request.',
      props: { view: 'add-start' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Items 2 C, 3 B, and 4 B are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedAdd = defineScreen({
  title: 'Proposal: Add a secret',
  description:
    'Cal chose Add. A modal opens with the type first, Secret or Env var, with Secret chosen and its hint. Then come the name, the description, the value, and the switch for all agents. A phone shows the modal as a sheet.',
  rationale: `${open} Cal asked on 20 November 2026 for a modal. Secret comes first and is chosen, because it keeps a value out of every cloud computer until a member allows it. The name follows the rule of new secret names, also for env vars (item 4 B).`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'add' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'env',
      title: 'Proposal: Add an env var',
      description:
        'Cal chose Env var. The hint says that the value is added to every cloud computer automatically, at each start. The modal asks for the name and the value, with no description, and ends with the switch Hide on screen, which starts on.',
      rationale:
        'Only admins add env vars (decision 57), so only an admin sees the type. A new env var starts hidden (decision 133), with the word of item 3 B. An env var has no description, because its stored format has none and it never makes a request.',
      props: { view: 'add-env' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Items 2, 3, and 4 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedAdd = defineScreen({
  title: 'Proposal: Add secrets',
  description:
    'Cal chose Add. A compact modal opens with the type first, Secret or Env var, with Secret chosen. Under it, each row is a name and a value, here LINEAR_API_KEY. Add another adds a row, and the hint says that lines like NAME=value pasted into a name add several at once. The switch for all agents applies to every new secret. A phone shows the modal as a sheet.',
  rationale: `${open} Cal asked on 20 November 2026 for a modal, then for a compact one that takes many values at once. So the modal asks only for names and values. A secret gets its description later in its Edit modal, and the Worker already takes a secret without one. Secret comes first and is chosen, because it keeps a value out of every cloud computer until a member allows it. Each name follows the rule of new secret names, also for env vars (item 4 B).`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'add' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'env',
      title: 'Proposal: Paste env vars',
      description:
        'Cal chose Env var and pasted four lines of a .env file into the first name. The modal split them into four rows: SENTRY_DSN, POSTHOG_KEY, REDIS_URL, and LOG_LEVEL, then an empty row. The button says Add 4.',
      rationale:
        'Only admins add env vars (decision 57), so only an admin sees the type. The paste ignores empty lines and lines that start with #, and it drops an export at the start of a line and quotes around a value. New env vars start hidden on screen (decision 133). The switch shows only in the Edit modal, so the Add modal stays short.',
      props: { view: 'add-env' },
    },
  ],
})

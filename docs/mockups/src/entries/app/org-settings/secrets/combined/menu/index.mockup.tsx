import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  "This page is a proposal for review, from Cal's review of 20 November 2026. Items 2, 3, and 4 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force until the change lands."

export const combinedMenu = defineScreen({
  title: 'Proposal: the menu of a row',
  description:
    'Cal opened the "⋯" menu of STRIPE_SECRET_KEY, an env var: Edit and Delete. The menu of a secret has Reveal value, Edit, and Delete. A phone shows the menu as a sheet.',
  rationale: `${open} One button per row keeps the list short, as Cal asked on 20 November 2026. The menu shows only the actions that the viewer may take, and a row with none has no button.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'menu' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

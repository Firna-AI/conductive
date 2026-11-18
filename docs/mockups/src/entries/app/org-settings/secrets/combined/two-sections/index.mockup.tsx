import { defineScreen } from '@mokly/mokly'
import {
  acmeValuesState,
  OrgValuesScreen,
  orgValuesSchema,
} from '../../../../../../screens/OrgValuesScreen'

const open =
  'This page is a proposal for review. Items 1 B, 2 C, 3 B, and 4 B of 17 November 2026 are still open, so app/org-settings/secrets and app/org-settings/cloud-computer stay the spec in force.'

export const combinedTwoSections = defineScreen({
  title: 'Option 1 A: two sections, for comparison',
  description:
    'Option 1 A of the same item: the Secrets tab holds the secrets as today, then the env vars in a section of their own under them, with Add variable. Two lists and two Add buttons stay on one page.',
  rationale: `${open} This page draws option 1 A, so Cal can compare it with the one list of option 1 B. It needs less work, but the admin still picks the list before Add.`,
  relatedDocs: [],
  propSchema: orgValuesSchema,
  props: { ...acmeValuesState, view: 'two-sections' },
  render: (props, context) => (
    <OrgValuesScreen state={props} viewport={context.viewport} />
  ),
})

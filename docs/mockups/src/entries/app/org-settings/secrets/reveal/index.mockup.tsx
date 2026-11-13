import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const revealSecret = defineScreen({
  title: 'Reveal a value',
  description:
    'Cal, an admin, chose Reveal on PROD_DATABASE_URL. Its value shows on a line of its own under the row, with Copy and Hide. The record of the row says "Revealed by you, just now". The other values stay hidden.',
  rationale:
    'Secrets decision 2 A: an admin reveals one value at a time. The list never holds a value, so the Worker returns only the value of this reveal, and the app records the admin and the time. A second Reveal hides the first value. A member sees no Reveal, also for a secret that they added.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets', secrets: 'revealed' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

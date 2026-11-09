import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const changeValue = defineScreen({
  title: 'Change a value',
  description:
    'An admin chose Change on DATABASE_URL. A field for the new value takes the place of the dots and the actions, with Save and Cancel. The Secret switch stays in the row, and the new value keeps the mark. On a phone the field moves under the name and the switch.',
  rationale:
    'The browser never gets a stored value, so a change asks for the whole new value. The Secret switch saves the mark at once, without the value, so an admin can mark an old variable without its value (decision 133).',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', envForm: 'change' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

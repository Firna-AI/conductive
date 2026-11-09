import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const addVariable = defineScreen({
  title: 'Add variable',
  description:
    'An admin chose Add variable. The form under the list asks for the name and the value, and its Secret switch is on at the start. Save variable adds the variable and closes the form. The note above the form says that the app hides secret values in agent output and start logs, and that changes apply at the next start.',
  rationale:
    'The user chose option C of decision 133 on 8 November 2026: an admin marks each env var as secret, and the app hides only the secret values in agent output and start logs. A new variable starts secret, so a value that nobody marked stays hidden. The value stays write-only for both marks. A cloud computer gets its variables and their marks when it starts, so the note says when a change applies.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', envForm: 'add' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountSchema,
  connectedAccount,
} from '../../../../screens/AccountScreen'

export const shareNotSaved = defineScreen({
  title: 'Share setting not saved',
  description:
    'The user turned on the switch of the Claude login, and the app could not save the change. The switch shows the saved value, off, again. Under the hint, the row says that the change was not saved, and why. The words stay until the next change of that switch.',
  rationale:
    'The switch saves at once, so a change that failed must not look saved. The cause stays beside the switch, not in a toast that goes away, because the setting decides who can use the login.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...connectedAccount, shareChange: 'not-saved' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})

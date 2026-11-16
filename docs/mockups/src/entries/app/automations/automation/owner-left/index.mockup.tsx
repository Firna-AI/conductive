import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const ownerLeftAutomation = defineScreen({
  title: 'Moved from a member who left',
  description:
    'Lena Park created this automation and then left Acme. The automation moved, turned off, to Cal, the admin who got the workspaces of Lena. A notice tells Cal that it moved and stays off until Cal turns it on. Cal now owns it, so Cal can change it, turn it on, use Run now, and delete it. Its runs stay in the list.',
  rationale:
    'The user chose option E of decision 508 on 9 November 2026: at the leave, an automation moves to the admin who gets the workspaces of the member who left. It stays off, because its runs would now use the logins of that admin. Its run workspaces are normal workspaces, so they stay.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, automation: 'copy-review', runs: 'owner-left' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})

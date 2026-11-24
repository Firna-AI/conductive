import { defineScreen } from '@mokly/mokly'
import {
  PhoneNoticesScreen,
  phoneNoticesSchema,
} from '../../../screens/PhoneNoticesScreen'

export const phoneNotices = defineScreen({
  title: 'Ask for notices',
  description:
    'Cal just sent the first message of a turn in the phone app, and the agent works. The app asks once whether to turn on notices: a sheet over the workspace on a phone, and a dialog over the workspace in the desktop layout of a tablet. The ask says that a notice comes when an agent asks for approval, a secret, or an answer, and when a turn of Cal finishes or fails, and that a notice shows the workspace name, not the chat. Not now closes the ask and shows the running turn. Turn on notices opens the alert of the system, as phone-app/notices/system shows. The child pages show that alert and the Notices section of Preferences.',
  rationale:
    'Decision 2 A of the Expo app plan, 23 November 2026: a notice goes out only when work waits for a person, an approval, a secret request, or a question from the agent, and when a turn that the member started ends or fails. Decision 3 A: a notice shows only the workspace name and the kind of event. The system lets an app show its alert for the permission only once, so the app asks first, at the moment when a notice first helps: after the first message of a turn that the member sends in the phone app. That moment is a design call of 23 November 2026. Not now keeps the alert of the system for later, so Preferences can still show it, as phone-app/notices/denied/not-now shows. The ask is the question of the app: a sheet on a phone and a dialog on a computer.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: phoneNoticesSchema,
  props: { view: 'ask' },
  render: (props, context) => (
    <PhoneNoticesScreen state={props} viewport={context.viewport} />
  ),
})

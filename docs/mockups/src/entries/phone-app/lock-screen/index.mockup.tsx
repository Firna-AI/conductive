import { defineScreen } from '@mokly/mokly'
import { PhoneLockScreen } from '../../../screens/PhoneLockScreen'

export const phoneLockScreen = defineScreen({
  title: 'Notices on the lock screen',
  description:
    'The lock screen of the phone of Cal, with the time, the date, and one notice for each event that sends one, newest first. Each notice shows the app icon, the app name, and the age, then the workspace name as its title and the kind of event as its text: Needs a secret for Checkout address autocomplete, Needs approval for Fix flaky cart test, Needs an answer for Saved carts, Turn finished for Retry failed webhooks, and Turn failed for Apple Pay button. A workspace with no name yet shows Untitled. A press on a notice opens its workspace. The notice of the secret request opens app/secret-requests, where the request waits above the composer and the phone can answer it. A notice of an approval opens the workspace, where the phone shows the command that waits for the Mac of Cal without its choices, as app/mac-commands shows. The desktop view shows the lock screen of a tablet in landscape, with the same notices beside the time.',
  rationale:
    'Decision 2 A of the Expo app plan, 23 November 2026: a notice goes out only when work waits for a person, an approval, a secret request, or a question from the agent, and when a turn that the member started ends or fails. Decision 3 A: a notice shows only the workspace name and the kind of event, such as "Needs approval", and no agent text. So no notice names a session, a command, a secret, or a model. The three waits share the words "Needs", as the list mark says Needs input. The two ends name the turn, as the chat names a finished turn. The app sends the title and the text. The system draws the icon, the name, and the age, so the page follows iOS in neutral shapes. Only the Mac app can allow a command on a Mac, so a phone shows that request without its choices. The product has no event for a question from the agent today: an agent that asks ends its turn.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  props: {},
  useCasePaths: ['user-flows/open-a-notice'],
  render: (_props, context) => <PhoneLockScreen viewport={context.viewport} />,
})

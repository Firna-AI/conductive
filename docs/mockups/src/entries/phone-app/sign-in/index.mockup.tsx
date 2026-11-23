import { defineScreen } from '@mokly/mokly'
import {
  PhoneSignInScreen,
  phoneSignInSchema,
} from '../../../screens/PhoneSignInScreen'

export const phoneAppSignIn = defineScreen({
  title: 'Sign in',
  description:
    'The phone app opens on the sign-in when nobody is signed in. The card is the sign-in of the app: the title, the text, the agreement to the Terms, and Continue with GitHub. Continue with GitHub opens GitHub in the auth session of the system, over the app. iOS asks first with its alert, and Android opens the session at once. The wordmark is no link, and the foot has only the links to Terms and Privacy, which open in the in-app browser. The desktop view shows the phone app on a tablet, in the desktop layout.',
  rationale:
    'Expo app decision 8 C of 23 November 2026: GitHub sign-in runs in the system browser, with a one-use handoff and a verifier. A design call of the same day chose the auth session of the system, through the auth session of Expo: ASWebAuthenticationSession on iOS, and Custom Tabs on Android. It is the common practice for native apps (RFC 8252). The person stays in the app, the session tells the app about a cancel, and it shares the sign-in of the system browser. The card keeps the words of the sign-in of the app, because a new person also creates the account here and then waits on the waitlist. The phone apps show no pricing, so no page of a phone app links to the home page of the site.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: phoneSignInSchema,
  props: { stage: 'start' },
  useCasePaths: ['user-flows/phone-sign-in'],
  render: (props, context) => (
    <PhoneSignInScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'ask',
      title: 'Alert of iOS',
      description:
        'Continue with GitHub on iOS. Before the auth session opens, iOS shows its alert over the start. Its fixed words say that the app wants to use the address of the app to sign in, and that the app and the website can share information about the person. Cancel returns to the start. Continue opens GitHub in the auth session, over the app. Android shows no alert, so its Continue with GitHub opens the session at once.',
      rationale:
        'iOS shows this alert before each auth session that shares the sign-in of the system browser, and the app cannot change its words. So the mockup draws the words as iOS writes them, in the neutral shapes of the alerts of the system. The name comes from the product name, and the host from the address of the app.',
      props: { stage: 'ask' },
      useCasePaths: ['user-flows/phone-sign-in'],
    },
    {
      slug: 'waiting',
      title: 'Finishing the sign-in',
      description:
        'GitHub signed the person in, and the auth session closed. The session handed the one-use code back, and the app exchanges it for its own sign-in. The card shows Signing in with a spinner, and no button. Then the app opens.',
      rationale:
        'The sheet of GitHub covers the app until GitHub ends, so the person cannot come back to the app before then. Only the exchange runs after it, so the card needs no Cancel. A close of the sheet returns to the start, with no error. The errors of the GitHub step show in the sheet, as they show in the browser for the Mac app.',
      props: { stage: 'waiting' },
      useCasePaths: ['user-flows/phone-sign-in'],
    },
    {
      slug: 'failed',
      title: 'Sign-in did not finish',
      description:
        'The auth session handed the sign-in back, but the app could not finish it. The one-use code expired after 60 seconds, the code was already used, or the exchange did not reach the server. A danger notice above the agreement says that the sign-in did not finish. Continue with GitHub starts a new sign-in.',
      rationale:
        'Each cause has the same recovery, a new sign-in, so one notice serves them all. The notice names no code, because the person never sees one. The errors of the GitHub step itself, such as a cancel on GitHub or a suspended account, show in the sheet of the auth session. So this state covers only the exchange after GitHub. The Mac app also lets the person start again after a failed exchange.',
      props: { stage: 'failed' },
    },
    {
      slug: 'ended',
      title: 'Signed out',
      description:
        'The phone was signed out, so the app shows the sign-in again, with the title Sign in again. The causes: the 30 days of the phone sign-in ended, a refresh found a new revision of the Terms, or an operator suspended the account. The words hold for each cause. The agreement to the current Terms sits above Continue with GitHub, as on every sign-in.',
      rationale:
        'Decision 8 C keeps a phone signed in for up to 30 days, and each refresh checks the revision of the Terms. A refresh with a new revision fails, and the phone shows the sign-in with the agreement. A suspension ends the sign-in at once, and the GitHub step then refuses the person in the sheet of the auth session. One set of words needs no cause from the server, and the agreement covers a new revision. The words name no session, because a session in the app is a chat with an agent.',
      props: { stage: 'ended' },
    },
  ],
})

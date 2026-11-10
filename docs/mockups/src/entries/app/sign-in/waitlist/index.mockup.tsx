import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../../brand'
import {
  WaitlistScreen,
  waitlistSchema,
} from '../../../../screens/WaitlistScreen'

export const signInWaitlist = defineScreen({
  title: 'Waitlist',
  description:
    'The only screen of a person who signed in with GitHub but has no app access yet, here Sam Okafor. It says that Sam is on the waitlist, and it names the address that gets an email when an operator approves Sam: sam@example.com, the primary verified email of the GitHub account. The field takes an invite code: one that an operator made, or the invite code of a user. Use code lets Sam in at once, and Get started opens. The foot of the card names the GitHub account, with Sign out, which returns to the sign-in. The child pages show a code that was not found, a code that the pause of sign-ups stopped, an org invitation, also when the pause stops its Accept, and an account with no verified email.',
  rationale:
    'The user chose option B of decision 161: a new GitHub sign-in creates the account and its session without app access, and the app shows only this screen until an approval, a code, or an org invitation lets the person in. The user chose option B of decision 162: one email at the approval, to the primary verified email of the GitHub account. The screen names that address, so the person knows which inbox to watch. Operators approve people in any order, so the screen names no place in line. The Worker has no route that deletes an account, so the screen has no Delete account. The page stands alone, as the sign-in does, because the person reaches no org, no Account page, and no Get started. The words say "invite code" for both kinds of code, and they never say "referral". The states of the screen are child pages that kept their paths, so this page shows only its canonical screen.',
  relatedDocs: [],
  address: appDomain,
  propSchema: waitlistSchema,
  props: {
    email: 'verified',
    code: 'none',
    from: 'field',
    invitations: 'none',
  },
  useCasePaths: ['user-flows/sign-up'],
  render: (props, context) => (
    <WaitlistScreen state={props} viewport={context.viewport} />
  ),
})

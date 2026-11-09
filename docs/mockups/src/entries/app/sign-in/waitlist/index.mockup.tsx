import { defineScreen } from '@mokly/mokly'
import { appDomain, productName } from '../../../../brand'
import {
  WaitlistScreen,
  waitlistSchema,
} from '../../../../screens/WaitlistScreen'

export const signInWaitlist = defineScreen({
  title: 'Waitlist',
  description:
    'The only screen of a person who signed in with GitHub but has no app access yet, here Sam Okafor. It says that Sam is on the waitlist, and it names the address that gets an email when an operator approves Sam: sam@example.com, the primary verified email of the GitHub account. The field takes an invite code: one that an operator made, or the invite code of a user. Use code lets Sam in at once, and Get started opens. The foot of the card names the GitHub account, with Sign out, which returns to the sign-in.',
  rationale:
    'The user chose option B of decision 161: a new GitHub sign-in creates the account and its session without app access, and the app shows only this screen until an approval, a code, or an org invitation lets the person in. The user chose option B of decision 162: one email at the approval, to the primary verified email of the GitHub account. The screen names that address, so the person knows which inbox to watch. Operators approve people in any order, so the screen names no place in line. The Worker has no route that deletes an account, so the screen has no Delete account. The page stands alone, as the sign-in does, because the person reaches no org, no Account page, and no Get started. The words say "invite code" for both kinds of code, and they never say "referral".',
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
  variants: [
    {
      slug: 'code-failed',
      title: 'Code not found',
      description:
        'Sam typed a code that does not exist. The field keeps the text with a red outline, and the reason shows under it with one thing to do: check it and try again. A code that an operator disabled, or that is used up, names its own reason and asks for another one. The code control of mockups:serve shows each reason.',
      rationale:
        'Each reason has its own words, so the person knows whether to fix the code, ask for another one, or come back later. The reasons are unknown, disabled, used up, and the pause. Nobody can guess a random code of 10 characters, so the field has no limit on attempts.',
      props: { code: 'unknown' },
    },
    {
      slug: 'paused',
      title: 'Sign-ups paused',
      description:
        'Sam used a code while the operator has paused sign-ups. The notice says to try the code again later, and that it stays unused. The field keeps the code.',
      rationale:
        'The pause stops every way in except an approval: invite codes, invite links, and the org invitations of people who wait. A code that the pause stopped stays unused, so nobody loses a code. No email goes out when the pause ends, so the notice asks the person to come back. The screen shows the pause only after a code, because an approval still works during the pause.',
      props: { code: 'paused' },
    },
    {
      slug: 'invited',
      title: 'Org invitation',
      description:
        "Acme invited the verified email of Sam's GitHub account. The invitation shows above the code field, and Accept invitation is the main action: it joins Acme, gives Sam app access in the same step, and opens the org. The code field stays.",
      rationale:
        'An org admin invites a person by email, as the user chose in decision 78. A person who waits sees their invitations here, not on app/sign-in/invitations, with the same rows. Accept gives app access with the membership, so nobody joins an org that they cannot use.',
      props: { invitations: 'pending' },
    },
    {
      slug: 'no-email',
      title: 'No verified email',
      description: `Sam's GitHub account has no verified email, so no email can go out at the approval. The line promises no email. It says that ${productName} opens here once Sam is approved. The code field stays, and no org invitation shows.`,
      rationale:
        'The approval email goes only to the primary verified email of the GitHub account, as the user chose in decision 162, so the screen makes no promise that the app cannot keep. The words keep a positive frame: they say where the app opens, not what is missing. An org invitation needs a verified email of the GitHub account, so this state has none.',
      props: { email: 'none' },
    },
  ],
})

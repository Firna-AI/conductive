import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../../../brand'
import {
  WaitlistScreen,
  waitlistSchema,
} from '../../../../../screens/WaitlistScreen'

export const signInWaitlistInvited = defineScreen({
  title: 'Org invitation',
  description:
    "Acme invited the verified email of Sam's GitHub account. The invitation shows above the code field, and Accept invitation is the main action: it joins Acme, gives Sam app access in the same step, and opens the org. The code field stays.",
  rationale:
    'An org admin invites a person by email, as the user chose in decision 78. A person who waits sees their invitations here, not on app/sign-in/invitations, with the same rows. Accept gives app access with the membership, so nobody joins an org that they cannot use. Org invitations have no count, as the user chose in decision 163, so the screen names no limit. Moved here from a saved state of the waitlist page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  address: appDomain,
  propSchema: waitlistSchema,
  useCasePaths: ['user-flows/accept-invitation'],
  props: {
    email: 'verified',
    code: 'none',
    from: 'field',
    invitations: 'pending',
  },
  render: (props, context) => (
    <WaitlistScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'paused',
      title: 'Accept during the pause',
      description:
        'Sam pressed Accept invitation while the operator has paused sign-ups. Sam does not join Acme and gets no app access. A notice above the invitation says that it stays, and asks Sam to accept it again when sign-ups resume. The invitation and Accept invitation stay, and nothing is used up.',
      rationale:
        'The pause stops every way in except an approval, also the org invitations of people who wait, as the design of the waitlist plan says. The Worker refuses the Accept and keeps the invitation, so Sam loses nothing. No email goes out when the pause ends, so the notice asks Sam to come back. The notice sits above the rows, as the notice of a failed accept does on app/sign-in/invitations.',
      props: { invitations: 'paused' },
    },
  ],
})

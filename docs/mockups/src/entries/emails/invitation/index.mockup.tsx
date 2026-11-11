import { defineScreen } from '@mokly/mokly'
import {
  InvitationEmailScreen,
  invitationEmailSchema,
} from '../../../screens/InvitationEmailScreen'

export const emailsInvitation = defineScreen({
  title: 'Org invitation email',
  description:
    "The email that the invite of an org admin sends. Cal, an admin of Acme, invited sam@example.com, the primary verified email of Sam's GitHub account. The email names Cal with the GitHub login, Acme with its tile, and what Conductive does. Accept invitation opens the app, and the line under it names the account to sign in with. The plain link repeats the address of the button. The footer says where the invitation went and that a reply reaches a person.",
  rationale:
    'Every email of Conductive shares one layout: the app icon with the name of the product, one heading, short paragraphs, one button, its address as a plain link, and a footer. React Email components draw it, and the Worker renders the same components when it sends an email. The GitHub login stands beside the name, so the person can check the inviter on GitHub. The app shows an invitation only to a GitHub account with the invited email verified, as the user chose in decision 78, so the email names that account. A reply goes to hello@conductive.build, because the sender domain receives no mail. The email is light, and it gives dark colours to the email clients that read them, as the dark view shows. The frame around the email stands for any mail client.',
  relatedDocs: [],
  propSchema: invitationEmailSchema,
  props: { invitation: 'acme' },
  useCasePaths: ['user-flows/accept-invitation'],
  render: (props, context) => (
    <InvitationEmailScreen
      colorScheme={context.colorScheme}
      state={props}
      viewport={context.viewport}
    />
  ),
  variants: [
    {
      slug: 'long-name',
      title: 'Long org name',
      description:
        "An org with a long name invites Sam. The name wraps in the subject, the heading, and the first paragraph. The admin's GitHub account has no name, so the email names the login alone.",
      props: { invitation: 'long-name' },
    },
  ],
})

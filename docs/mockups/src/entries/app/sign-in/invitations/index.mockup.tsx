import { defineScreen } from '@mokly/mokly'
import {
  InvitationsScreen,
  invitationsSchema,
} from '../../../../screens/InvitationsScreen'

export const signInInvitations = defineScreen({
  title: 'Invitations',
  description:
    'The page after the GitHub sign-in when orgs invited a verified email of the GitHub account. It shows before the app opens an org or Get started. Each invitation names its org and the invited email. Accept invitation joins that org and opens it. Continue to workspaces accepts nothing, and the app opens as usual: here Get started, because Cal has no org yet.',
  rationale:
    'An admin invites a person by email, and the person joins with a GitHub account that has that email verified, as the user chose in decision 78. The person accepts each invitation, so the app joins nobody on its own, and the page has no Decline. The app reads the pending invitations of the signed-in person before it opens anything. With none, it opens as usual, so the page has no empty state, and the wait shows the usual loading state of the app. A failed accept shows a notice with the message of the server and Try again, as a failed create does in app/new-workspace. A list that did not load shows the load failure of the other lists of the app, and Continue to workspaces keeps the rest of the app open. An invitation names no org initials and no sender, so each row shows the open-invite mark of the Members tab.',
  relatedDocs: [],
  propSchema: invitationsSchema,
  props: { result: 'list' },
  render: (props, context) => (
    <InvitationsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Not accepted',
      description:
        'The accept of the Acme invitation failed. The notice names the org and gives the message of the server. Try again accepts it again. The list stays, and Continue to workspaces still accepts nothing.',
      props: { result: 'accept-failed' },
    },
    {
      slug: 'not-loaded',
      title: 'Not loaded',
      description:
        'The list of invitations did not load, so the app cannot tell whether invitations wait. The notice names what failed and gives the message of the server. Try again loads the list again. Continue to workspaces opens the app without it.',
      props: { result: 'load-failed' },
    },
  ],
})

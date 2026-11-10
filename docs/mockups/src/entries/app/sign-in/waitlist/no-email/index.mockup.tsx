import { defineScreen } from '@mokly/mokly'
import { appDomain, productName } from '../../../../../brand'
import {
  WaitlistScreen,
  waitlistSchema,
} from '../../../../../screens/WaitlistScreen'

export const signInWaitlistNoEmail = defineScreen({
  title: 'No verified email',
  description: `Sam's GitHub account has no verified email, so no email can go out at the approval. The line promises no email. It says that ${productName} opens here once Sam is approved. The code field stays, and no org invitation shows.`,
  rationale:
    'The approval email goes only to the primary verified email of the GitHub account, as the user chose in decision 162, so the screen makes no promise that the app cannot keep. The words keep a positive frame: they say where the app opens, not what is missing. An org invitation needs a verified email of the GitHub account, so this state has none. Moved here from a saved state of the waitlist page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  address: appDomain,
  propSchema: waitlistSchema,
  props: {
    email: 'none',
    code: 'none',
    from: 'field',
    invitations: 'none',
  },
  render: (props, context) => (
    <WaitlistScreen state={props} viewport={context.viewport} />
  ),
})

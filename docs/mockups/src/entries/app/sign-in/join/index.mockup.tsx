import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../../brand'
import { linkCode } from '../../../../fixtures/waitlist'
import { SignInScreen } from '../../../../screens/SignInScreen'

export const signInJoin = defineScreen({
  title: 'Join link',
  description:
    'The sign-in page that an invite link opens. A notice says that an invite code comes with the link, and shows the code. Continue with GitHub agrees to the terms and signs the person in. For a new person, or a person who waits, the code then gives app access, and Get started opens. A person who already has app access uses no code, and the app opens as usual.',
  rationale:
    'A code works in a link as well as in the field of the waitlist, because a shared link needs no typing. The link keeps the code through the Terms page and the GitHub sign-in. The page names no owner of the code, because a shared code can travel far, and the login of its owner would travel with it. The page checks nothing before GitHub, so it makes no promise that the code works. The code of a person who has app access stays unused for someone else.',
  relatedDocs: [],
  address: `${appDomain}/join/${linkCode}`,
  props: {},
  useCasePaths: ['user-flows/join'],
  render: (_props, context) => (
    <SignInScreen code={linkCode} viewport={context.viewport} />
  ),
})

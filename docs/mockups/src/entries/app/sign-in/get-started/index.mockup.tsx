import { defineScreen } from '@mokly/mokly'
import {
  GetStartedScreen,
  getStartedSchema,
} from '../../../../screens/GetStartedScreen'

const signUp = ['user-flows/sign-up']

export const getStarted = defineScreen({
  title: 'Get started',
  description:
    'The only first run, after the GitHub sign-in, in three steps: install the GitHub App on the account that owns the repositories, create the first org, and connect Claude or Codex. Create org waits for the install.',
  rationale:
    'A GitHub App user token reaches only what both the user and the app can reach, so a new user must install the app before an org can list repositories. The steps are numbered, so the order is clear without a note. Install the GitHub App opens GitHub, which returns here when the install is done. The user chose option D of decision 33: the first run connects an agent, and the composer asks for one when it is missing. The app runs every cloud computer on its own account, so the first run asks for no key and no other account, as the user chose in decision 80.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: { step: 'install' },
  useCasePaths: signUp,
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'installed',
      title: 'GitHub App installed',
      description:
        'Back from GitHub: the app is installed on firna with its 3 repositories. Create org is the next step.',
      props: { step: 'org' },
      useCasePaths: signUp,
    },
    {
      slug: 'org-created',
      title: 'Org created',
      description:
        'Firna exists, and the rail shows it. The form of Claude is open, because the default model is a Claude model. Codex can follow at any time.',
      props: { step: 'agent' },
      useCasePaths: signUp,
    },
    {
      slug: 'connected',
      title: 'Agent connected',
      description:
        'Claude is connected with a subscription token, so every step is done. Open Firna leads to the new org.',
      props: { step: 'done' },
      useCasePaths: signUp,
    },
  ],
})

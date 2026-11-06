import { defineScreen } from '@mokly/mokly'
import {
  GetStartedScreen,
  getStartedSchema,
} from '../../../../screens/GetStartedScreen'

const signUp = ['user-flows/sign-up']

export const getStarted = defineScreen({
  title: 'Get started',
  description:
    'The only first run, after the GitHub sign-in, in four steps: install the GitHub App on the account that owns the repositories, create the first org, add its Boat key, and connect Claude or Codex. Create org waits for the install, and the key field waits for the org.',
  rationale:
    'A GitHub App user token reaches only what both the user and the app can reach, so a new user must install the app before an org can list repositories. The key belongs to the org, as the user chose in decision 46, so it follows the org. The steps are numbered, so the order is clear without a note. Install the GitHub App opens GitHub, which returns here when the install is done. The user chose option D of decision 33: the first run sets up the key and an agent, and the composer asks for each one when it is missing. Get started names Boat and says that users need their own Boat account, as the user chose in decision 47.',
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
        'Firna exists, and the rail shows it. The next step asks for its Boat key, with links to the Boat sign-up and dashboard, and tests the key once when it is saved.',
      props: { step: 'key' },
      useCasePaths: signUp,
    },
    {
      slug: 'key-saved',
      title: 'Boat key saved',
      description:
        'The key passed its test, and the step shows only its last four characters. The form of Claude is open, because the default model is a Claude model. Codex can follow at any time.',
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

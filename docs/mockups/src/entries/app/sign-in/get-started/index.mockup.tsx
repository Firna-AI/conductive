import { defineScreen } from '@mokly/mokly'
import {
  GetStartedScreen,
  getStartedSchema,
} from '../../../../screens/GetStartedScreen'

const signUp = ['user-flows/sign-up']

export const getStarted = defineScreen({
  title: 'Get started',
  description:
    'The only first run, after the GitHub sign-in: install the GitHub App on the account that owns the repositories, connect Claude or Codex, then create the first org. Create org waits for the install.',
  rationale:
    'A GitHub App user token reaches only what both the user and the app can reach, so a new user must install the app before an org can list repositories. The steps are numbered, so the order is clear without a note. Install the GitHub App opens GitHub, which returns here when the install is done. The agent step waits on decision 33, drawn as its recommended option D: the first run sets up an agent, and the composer asks for one when none is connected.',
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
        'Back from GitHub: the app is installed on acme with its 6 repositories. Connect Claude or Codex is the next step, and Create org already works.',
      props: { step: 'connect' },
      useCasePaths: signUp,
    },
    {
      slug: 'connected',
      title: 'Agent connected',
      description:
        'Claude is connected, and Codex can follow at any time. Create org opens the form of the first org.',
      props: { step: 'create' },
      useCasePaths: signUp,
    },
  ],
})

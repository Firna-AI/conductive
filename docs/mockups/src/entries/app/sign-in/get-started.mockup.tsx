import { defineScreen } from '@mokly/mokly'
import {
  GetStartedScreen,
  getStartedSchema,
} from '../../../screens/GetStartedScreen'

export const getStarted = defineScreen({
  title: 'Get started',
  description:
    'The first run after the GitHub sign-in: install the GitHub App on the account that owns the repositories, then create the first org. Create org waits for the install.',
  rationale:
    'A GitHub App user token reaches only what both the user and the app can reach, so a new user must install the app before an org can list repositories. The two steps are numbered, so the order is clear without a note. Install the GitHub App opens GitHub, which returns here when the install is done.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: { github: 'not-installed' },
  useCasePaths: ['user-flows/sign-up'],
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'installed',
      title: 'GitHub App installed',
      description:
        'Back from GitHub: the app is installed on acme with its 6 repositories, and Create org opens the form of the first org.',
      props: { github: 'installed' },
      useCasePaths: ['user-flows/sign-up'],
    },
  ],
})

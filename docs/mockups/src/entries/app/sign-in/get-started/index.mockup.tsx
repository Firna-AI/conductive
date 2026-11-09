import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../screens/GetStartedScreen'

export const getStarted = defineScreen({
  title: 'Get started',
  description:
    'The only first run, after the GitHub sign-in, in three steps: install the GitHub App on the account that owns the repositories, create an org, and connect Claude or Codex. Create org waits for the install, and it starts the first build of the cloud computer of the org. A person with no org comes here too.',
  rationale:
    'A GitHub App user token reaches only what both the user and the app can reach, so a new user must install the app before an org can list repositories. The steps are numbered, so the order is clear without a note. Install the GitHub App opens GitHub, which returns here when the install is done. The user chose option D of decision 33: the first run connects an agent, and the composer asks for one when it is missing. The app runs every cloud computer on its own account, so the first run asks for no key and no other account, as the user chose in decision 80. The user chose option C of decision 150 on 8 November 2026: the org step shows the first build, so the page keeps its three steps. The states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: getStartedFirstRun,
  useCasePaths: ['user-flows/sign-up'],
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})

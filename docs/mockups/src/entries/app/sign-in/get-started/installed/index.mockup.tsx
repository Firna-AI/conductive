import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedInstalled = defineScreen({
  title: 'GitHub App installed',
  description:
    'Back from GitHub: the app is installed on firna with its 3 repositories. Create org is the next step.',
  rationale:
    'Moved here from a saved state of the Get started page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: { ...getStartedFirstRun, step: 'org' },
  useCasePaths: ['user-flows/join'],
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})

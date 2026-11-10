import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedOrgCreated = defineScreen({
  title: 'Org created',
  description:
    'Firna exists, and the rail shows it. Create org started the first build of its cloud computer, and the org step shows that the cloud computer is being prepared, with the time of the build. The form of Claude is open, because the default model is a Claude model. Codex can follow at any time.',
  rationale:
    'The user chose option C of decision 150 on 8 November 2026: the app starts the first build when Create org saves an org with at least one repository, and the org step shows it. Get started keeps its three steps (decision 33), so the build shows inside the org step, and the person connects an agent while it runs. Moved here from a saved state of the Get started page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: { ...getStartedFirstRun, step: 'done', firstBuild: 'running' },
  useCasePaths: ['user-flows/join'],
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})

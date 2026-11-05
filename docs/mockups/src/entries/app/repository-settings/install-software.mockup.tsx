import { defineScreen } from '@mokly/mokly'
import { InstallSoftwareScreen } from '../../../screens/InstallSoftwareScreen'

export const installSoftware = defineScreen({
  title: 'Install software',
  description:
    'A terminal on the base of the repository. The user installs tools, then saves them to the base for new workspaces.',
  relatedDocs: [],
  render: (_props, context) => (
    <InstallSoftwareScreen viewport={context.viewport} />
  ),
})

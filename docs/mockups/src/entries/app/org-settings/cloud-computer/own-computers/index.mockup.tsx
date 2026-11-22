import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const cloudWithOwnComputers = defineScreen({
  title: 'With own computers',
  description:
    'The Cloud computer tab of Acme after Cal added own computers. The intro says that each workspace on the cloud computer starts from it, and that own computers use the same repositories, scripts, and env vars. The rest of the tab stays as it is.',
  rationale:
    'Each own computer builds the setup of the org from the base image of the app, as a cloud account does, so the scripts and the env vars of this tab reach own computers too. An admin who changes the install script reads that here, and the note of the Own computers tab links back.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', ownComputers: 'list' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

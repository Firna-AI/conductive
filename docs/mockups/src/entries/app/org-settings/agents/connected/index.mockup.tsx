import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const orgAgentsConnected = defineScreen({
  title: 'Both agents connected',
  description:
    'Connect of the Codex form on API key leads here. Claude runs on the gateway of Acme, and Codex on an API key of Acme. Each row says Connected, with Replace and Remove, and each login has its own switch "Use for every member", off. The Codex row says API key, and Claude names its host under its row.',
  rationale:
    'One org login for each agent, as one personal login for each agent, from the design calls of the org logins plan of 16 November 2026. A new switch starts off, from decision 7 B, so the members of Acme with a Codex login of their own keep using it until an admin turns the switch on.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'agents', orgLogins: 'both' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

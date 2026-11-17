import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const orgAgentsEndpointModels = defineScreen({
  title: 'Model list of the org endpoint',
  description:
    'The app read the model list of the gateway of Acme, and the list does not name Fable 5.1, a Claude model of the app. Under "Own endpoint at llm.acme.example.com", the Claude row says "Fable 5.1 is hidden from the model pickers on this login, because this endpoint does not list it." The line under it gives the model ID and the time of the last read: "Its model ID is claude-fable-5-1. Checked 12 minutes ago." Refresh reads the list again.',
  rationale:
    'The user chose decision 3 A of the org logins plan on 16 November 2026: each picker of a session or a new session on the org login follows the last model list of the org endpoint, as the pickers of the owner of a personal endpoint do (decision 10 G of the own endpoint plan). So every member of Acme on this login picks only models that the endpoint lists, as app/chat/endpoint-models/org and app/automations/automation/new/org-models show. The line names the pickers on this login, because a member with a login of their own keeps every model in their own sessions. Only an admin sees the line and Refresh, because only an admin can change the endpoint. The model ID helps the admin add the model to the gateway.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'agents', orgModels: 'unlisted' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

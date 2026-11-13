import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const secrets = defineScreen({
  title: 'Secrets',
  description:
    'The Secrets tab of Acme, as Cal, an admin, sees it. Each row shows the name of a secret, what it is for, who added it, and the record of its last reveal, such as "Revealed by you, 2 days ago". The value shows as dots. Each row has the switch for all agents, Reveal, Replace, and Delete. A note under the list says what the mark for all agents does. The last line says when to use the environment variables of the Cloud computer tab instead, and links to that tab. Add secret opens the form under the list.',
  rationale:
    'Cal asked on 13 November 2026 for secrets: named values of an org that an agent uses in one command after a member allows it (secrets decision 1 B). The agent gets only the name. Secrets decision 6 keeps this tab in the org settings, where members manage secrets. Secrets decision 2 A lets an admin reveal one value at a time, and each row shows the record of the last reveal. Secrets decision 3 B lets every member add secrets, lets a member replace and delete only their own, and lets only admins set the mark for all agents. The org env vars stay as they are: they reach every cloud computer at each start, and a secret reaches only a command that an agent runs after approval. So the tab says when to use each list. The tab sits after Cloud computer, and the Secrets row of the command palette opens it. The states of the tab are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

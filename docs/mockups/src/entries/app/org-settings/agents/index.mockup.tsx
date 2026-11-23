import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../screens/orgSettingsState'

export const orgAgents = defineScreen({
  title: 'Agents',
  description:
    'Cal, an admin of Acme, opens the Agents tab, which follows Cloud computer. It says that the members of Acme use these logins when they have none of their own. Claude runs on the gateway of Acme, so its row says Connected, and the line under it says "Own endpoint at llm.acme.example.com". The row has Replace and Remove. Under it, the switch "Use for every member" is off, and its hint says that members without a login of their own use the login. Codex has no org login, so its row has Connect. The tab shows no key and no full address.',
  rationale:
    'The user chose decision 1 B of the org logins plan on 16 November 2026: an admin connects an org login, an API key or an own endpoint, for each agent of the org. The user asked for it on its own tab of the org settings, as a copy of the Agents tab of the account with fewer options. So the tab has the rows, the form, the host, and the model list of the account, without a subscription token, a ChatGPT sign-in, or a share switch, because a subscription is for one person. The org login stays when the admin who connected it leaves, and the delete of the org deletes it. Decision 4: a member with no usable login of their own runs on the org login and needs none. Decision 6 A: the own login of a member comes first. Decision 7 B: the switch "Use for every member" makes each new session of the org take the org login, also for a member with a login of their own, and it starts off. Replace keeps the sessions on the login, and a running turn fails with the cause of a changed login. Remove makes the next message in such a session start a linked session, as app/composer/org-login/removed shows. The states of the tab are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'agents' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})

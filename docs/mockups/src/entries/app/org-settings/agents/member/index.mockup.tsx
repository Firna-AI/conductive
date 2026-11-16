import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const orgAgentsMember = defineScreen({
  title: 'Seen by a member',
  description:
    'Priya, a member who is not an admin, opens the Agents tab. It says that only an admin can change the logins. The Claude row says Connected, with "Own endpoint at llm.acme.example.com" under it, and the line "Members without a login of their own use it." The Codex row says Not connected. The tab has no Connect, Replace, Remove, switch, or model list.',
  rationale:
    'A design call of the org logins plan of 16 November 2026: only an admin connects, replaces, or removes an org login, and every member sees the tab read-only: the agent, the kind, and the host of an own endpoint, as members see the other org settings (decision 57). Nobody sees the key or the full address. The member reads the value of the switch "Use for every member" as its hint, as a member reads the Secret mark of an env var as a word, because the value decides which login the sessions of the member use. The model list stays with the admins, who can change the endpoint.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'agents', viewer: 'member' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'every-member',
      title: 'Use for every member, seen by a member',
      description:
        'An admin turned on "Use for every member" under the Claude login. The line under the Claude login of Acme now says "Every new session uses it, also for members with a login of their own."',
      rationale:
        'Decision 7 B of the org logins plan: while the switch is on, the new sessions of Priya in Acme run on the org login, also when she connects a login of her own. The line tells her why the composer names "Acme\'s login".',
      props: { everyMember: 'on' },
    },
  ],
})

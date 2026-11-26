import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../../../../../src/shared/brand'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

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
  variants: [
    {
      slug: 'v1-added',
      title: 'Codex address saved with /v1',
      description: `Connect of the Codex form on Own endpoint leads here. Claude runs on the gateway of Acme, saved as https://llm.acme.example.com. Cal typed the same address in the form of Codex and pressed Connect. The gateway serves the OpenAI Responses API only under /v1: https://llm.acme.example.com/models gives no model list, and https://llm.acme.example.com/v1/models gives one. So the save stored https://llm.acme.example.com/v1. Under "Own endpoint at llm.acme.example.com", the Codex row says "${productName} added /v1 to the address, because the endpoint lists its models there." The note stays until the page reloads, and a later save or Remove clears it. The list names every Codex model of the app, so the row shows no model line.`,
      rationale:
        'A design call of 17 November 2026 in the org logins plan: the Agents tab shows this note to an admin, as Account settings show it to the owner of a personal login, as app/account/endpoint-models/v1-added shows. Reason: each rule of an own endpoint also applies to an org endpoint, and only an admin sees the model list and Refresh. The rule of the save is Codex base decision 1 C, which Cal chose on 13 November 2026: when the typed base of a Codex endpoint gives no model list and the same base with /v1 gives one, the save stores the base with /v1. Without it, each Codex turn on the org login fails with HTTP 404. The tab shows only the host, so the note tells the admin that the saved address differs from the typed one. A member of Acme sees no note, as app/org-settings/agents/member/endpoints shows.',
      props: { orgModels: 'v1-added' },
    },
    {
      slug: 'read-failed',
      title: 'Model list not read',
      description: `Cal pressed Refresh on the Claude row, and the gateway of Acme refused the key. Under "Own endpoint at llm.acme.example.com", the row warns: "${productName} couldn't read the model list of this endpoint. Check the address and the key." Refresh, beside the warning, reads the list again, and a read that works removes the warning. A reload of the page, a later save, or Remove also removes it. The last list that the app read names every Claude model of the app, so the row shows no model line.`,
      rationale:
        'A design call of 17 November 2026 in the org logins plan: the Agents tab shows this warning to an admin, as Account settings show it to the owner of a personal login, as app/account/endpoint-models/read-failed shows. The warning comes from Codex base decision 1 C, which Cal chose on 13 November 2026, and it shows for both agents. The app stores no mark of a failed read. So a failed read in the background shows nothing, and only the page of the admin who saved or pressed Refresh shows the warning. Nobody sees the full address or the key, so the admin checks them in the setup of the gateway, and Replace saves new ones. The warning has an icon and words, so it never depends on colour alone. A member of Acme never sees the warning, as app/org-settings/agents/member/endpoints shows.',
      props: { orgModels: 'read-failed' },
    },
    {
      slug: 'read-failed-unlisted',
      title: 'Last list kept after a failed read',
      description:
        'As in app/org-settings/agents/endpoint-models/read-failed, the gateway refused the key at the Refresh of Cal. The last list that the app read, 12 minutes ago, does not name Fable 5.1, and a failed read keeps that list. So the Claude row shows the warning with Refresh, then "Fable 5.1 is hidden from the model pickers on this login, because this endpoint does not list it." and "Its model ID is claude-fable-5-1. Checked 12 minutes ago." The row has one Refresh, beside the warning.',
      rationale:
        'As on the account, which app/account/endpoint-models/read-failed-unlisted shows, the row has one Refresh, because one read changes both lines. Refresh sits beside the warning, because the failed read is what a new read can change. The model line keeps the words of the org login, and it gives the time of the last list that the app read. Each picker on the org login still hides Fable 5.1, from the list that the app kept (decision 3 A of the org logins plan). The design call of 17 November 2026 in the org logins plan puts these lines on the Agents tab of an admin.',
      props: { orgModels: 'read-failed-unlisted' },
    },
  ],
})

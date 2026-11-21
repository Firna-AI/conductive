import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const orgAgentsForm = defineScreen({
  title: 'Connect form',
  description:
    'Cal pressed Connect on the Codex row. The form opens under the row, with a switch of two kinds: API key and Own endpoint. API key starts selected. The words say to paste an API key of the OpenAI account of Acme, with the link Make one on OpenAI. The key field says that the app keeps the key encrypted and never shows it again. Cancel closes the form, and Connect saves the login of Acme.',
  rationale:
    'Decision 1 B of the org logins plan, which the user chose on 16 November 2026: the form of the account with fewer options. An org login is an API key or an own endpoint, because a subscription token and a ChatGPT plan are each for one person. The words name the account of the org, because the key or the endpoint of the org pays for the turns of its members. The app stores the key encrypted and never sends it back to the browser.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'agents', agentForm: 'api-key' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'endpoint',
      title: 'Own endpoint',
      description:
        'Cal chose Own endpoint in the form of Codex. The form says that the endpoint must serve the OpenAI Responses API and the Codex models that the picker offers. The Endpoint field shows the example address with /v1, and its hint names where the requests go through the app. The API key field takes the key of the endpoint.',
      rationale:
        'The org form uses the fields of the own endpoint of the account, with the same address rule (decision 9 E of the own endpoint plan). The gateway of the app sends each model request to the endpoint with the key, so no cloud computer gets the address or the key.',
      props: { agentForm: 'endpoint' },
    },
    {
      slug: 'refused',
      title: 'Endpoint refused',
      description:
        'Cal typed an address on http://localhost. The refusal takes the place of the hint under the Endpoint field: "Use a public https:// address with a host name, without a user name or a password." The key stays in its field.',
      rationale:
        'One shared rule checks the address of a personal endpoint and of an org endpoint, in the form and at the save, as app/account/own-endpoint/refused shows. The gateway calls the endpoint over the internet, so the rule refuses a local address.',
      props: { agentForm: 'refused' },
    },
    {
      slug: 'not-saved',
      title: 'Save failed',
      description:
        'Cal pressed Connect, and the save failed. A notice over the buttons says "Codex wasn\'t connected" and "The request failed. Try again." The key stays in its field, which is marked, so Cal can press Connect again.',
      rationale:
        'The form of the account shows a failed save in the same way in the app: the secret stays in the field, and a notice names the cause from the server, so the admin does not paste the key again. A refusal of the address shows at the address instead, as the refused variant shows.',
      props: { agentForm: 'not-saved' },
    },
    {
      slug: 'replace',
      title: 'Replace',
      description:
        'Cal pressed Replace on the Claude row. The form opens under the login, on Own endpoint, the kind of the login, with empty fields, because the app never shows the address or the key. The row keeps Connected, the host, and Remove, and the switch stays under the form. Cancel closes the form, and Replace saves the new login.',
      rationale:
        'A design call of the org logins plan of 16 November 2026: when an admin replaces the org login, its sessions keep it, and the login serves until the new one saves. A turn that runs at the save fails with the cause of a changed login, and Try again uses the new key, as for a personal login. Replace keeps the switch "Use for every member", because the switch belongs to the org login, not to its key, as a design call of the agent of the same day.',
      props: { agentForm: 'replace' },
    },
  ],
})

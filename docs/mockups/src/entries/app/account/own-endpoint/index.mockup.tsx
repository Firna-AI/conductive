import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../brand'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const ownEndpoint = defineScreen({
  title: 'Own endpoint',
  description: `Cal chose Own endpoint in the form of Claude, to run Claude on a gateway or a proxy. The form says that the endpoint must serve the Anthropic Messages API and the Claude models that the picker offers: Opus 5.5, Sonnet 5.5, and Fable 5.1. The Endpoint field shows the example https://gateway.example.com, without /v1. Its hint says "Requests go through ${productName} to https://gateway.example.com/v1/messages", and it follows the address that Cal types. The API key field takes the key of the endpoint. Codex already runs on Cal's proxy, so the line under its row says "Own endpoint at proxy.example.com", and its share switch is on.`,
  rationale:
    'Decision 1 A of the own endpoint plan, which Cal chose on 8 November 2026: each agent gets an own endpoint login, with an address and a key that the app stores encrypted. The gateway of the app, not the cloud computer, sends each model request of a turn to the endpoint with the key (gateway decision 10 B), so the hint says that the requests go through the app. One shared rule checks the address and builds the exact address of each request (decision 9 E), and the hint names that address: the base address with /v1/messages added. The form names the models that the app offers. After the save, the app reads the model list of the endpoint and hides from the pickers of the owner each model of the app that the list does not name (decision 10 G), as app/account/endpoint-models shows. The key hint promises no test.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'claude', ownEndpoint: 'form' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'typed',
      title: 'Address that the form saves',
      description: `Cal typed https://proxy.example.com/v1/, with a final /v1 and a trailing slash, and pasted the key. The hint says "Saves as https://proxy.example.com", without the /v1 and the slash, then "Requests go through ${productName} to https://proxy.example.com/v1/messages". Connect saves the login.`,
      rationale:
        'Decision 9 E, which Cal chose on 10 November 2026: one shared rule checks each address and builds the exact address that the gateway calls. It keeps a query, and it drops a fragment, a trailing slash, and a final /v1 of a Claude address, because each request path of Claude already starts with /v1. The form shows the address that it saves after these changes, so Cal sees it before Connect. When the rule keeps the typed address as it is, the hint names only where the requests go.',
      props: { ownEndpoint: 'typed' },
    },
    {
      slug: 'codex',
      title: 'Codex on an own endpoint',
      description: `Claude runs on Cal's proxy, and Connect opened the form of Codex on its own endpoint kind. The form says that the endpoint must serve the OpenAI Responses API and the Codex models that the picker offers: GPT-6.1 Sol and GPT-6 Astra. The example address ends with /v1, and the hint says "Requests go through ${productName} to https://gateway.example.com/v1/responses".`,
      rationale:
        'Codex sends its requests to the address with /responses added, and it refuses the Chat Completions API. So the endpoint must serve the Responses API, and the address ends with /v1, as the design calls of the own endpoint plan say. The shared rule keeps the /v1 of a Codex address.',
      props: { form: 'codex' },
    },
    {
      slug: 'refused',
      title: 'Address refused',
      description:
        'Cal typed http://localhost:8317, the address of a proxy on Cal\'s own computer, and pressed Connect. The form refused the address, so the Endpoint field says why in place of its hint: "Use a public https:// address with a host name, without a user name or a password." The key stays in its field, so Cal changes only the address.',
      rationale:
        'Decision 9 E, which Cal chose on 10 November 2026, in place of decision 2 B, which accepted http:// for localhost, 127.0.0.1, and [::1]. The gateway calls each endpoint over the internet, so the shared rule accepts only an https:// address with a public host name. It refuses localhost, names of one label, internal names, the names of the app and of its previews, and a user name or a password in the address. It also refuses each IP address, IPv4 or IPv6, as the host, because a fetch from the Worker to an IP address can fail (decision 13 A, which Cal chose on 11 November 2026). A host name that points to the IP address, such as 136.115.241.64.sslip.io, works when the server has a certificate for that name. The form and the save use the same rule, so the refusal shows at the field that needs the change before the save. It names the rule in plain words, and the form keeps the key, as a failed save does.',
      props: { ownEndpoint: 'refused' },
    },
    {
      slug: 'connected',
      title: 'Connected on an own endpoint',
      description:
        'Claude and Codex both run on Cal\'s proxy. Each row shows Connected and Remove, and the line under it says "Own endpoint at proxy.example.com". The switch that lets other members use the login is on.',
      rationale:
        'The account shows the kind and the host of an own endpoint, and never the key or the full address, because the address can hold a secret in its path or its query. The kind moves under the row with the host, so that a phone shows both in full. A new own endpoint login lets other members use it, like an API key, as Cal chose for decision 4 B on 9 November 2026. Its owner can turn the switch off at any time, as for the other kinds. A message of another member then starts a new session on the login of that member.',
      props: { form: 'none', ownEndpoint: 'connected' },
    },
  ],
})

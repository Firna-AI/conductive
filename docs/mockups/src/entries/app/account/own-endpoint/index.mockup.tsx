import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../screens/AccountScreen'

export const ownEndpoint = defineScreen({
  title: 'Own endpoint',
  description:
    'Cal chose Own endpoint in the form of Claude, to run Claude on a gateway or a proxy. The form says that the endpoint must serve the Anthropic Messages API and the Claude models that the picker offers: Opus 5.5, Sonnet 5.5, and Fable 5.1. The Endpoint field shows the example https://gateway.example.com, without /v1. Its hint says where the requests go, https://gateway.example.com/v1/messages, and it follows the address that Cal types. The API key field takes the key of the endpoint. Codex already runs on Cal\'s proxy, so the line under its row says "Own endpoint at proxy.example.com", and its share switch is on.',
  rationale:
    'Decision 1 A of the own endpoint plan, which Cal chose on 8 November 2026: each agent gets an own endpoint login, with an address and a key that the app stores encrypted. The claude program sends its requests to the address with /v1/messages added, so the address has no /v1. The form asks for no query and no fragment, because the claude program cannot call such an address, and the save does not refuse one (decision 2 B). The app keeps its own model list and never calls the endpoint (decision 3 A), so the form names the models that the endpoint must serve, and the key hint promises no test. The hint names the cloud computer as the sender, because a loopback address reaches only a proxy on the cloud computer.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'claude', ownEndpoint: 'form' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'codex',
      title: 'Codex on an own endpoint',
      description:
        "Claude runs on Cal's proxy, and Connect opened the form of Codex on its own endpoint kind. The form says that the endpoint must serve the OpenAI Responses API and the Codex models that the picker offers: GPT-6.1 Sol and GPT-6 Astra. The example address ends with /v1, and the hint says that the requests go to https://gateway.example.com/v1/responses.",
      rationale:
        'Codex sends its requests to the address with /responses added, and it refuses the Chat Completions API. So the endpoint must serve the Responses API, and the address ends with /v1, as the design calls of the own endpoint plan say.',
      props: { form: 'codex' },
    },
    {
      slug: 'refused',
      title: 'Address refused',
      description:
        'Cal typed http://proxy.example.com:8317 and pressed Connect. The save refused the address, so the Endpoint field says why in place of its hint: an https:// address is needed, and only localhost, 127.0.0.1, and [::1] can use http://. The key stays in its field, so Cal changes only the address.',
      rationale:
        'Decision 2 B, which Cal chose on 9 November 2026: the save refuses an http:// address unless its host is localhost, 127.0.0.1, or [::1], because an http:// address on the internet sends the key, the messages, and the files as plain text. A loopback address reaches a proxy on the cloud computer. The refusal shows at the field that needs the change, and the form keeps the key, as a failed save does.',
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

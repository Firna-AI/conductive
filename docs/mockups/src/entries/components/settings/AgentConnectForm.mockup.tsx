import { defineComponent } from '@mokly/mokly'
import { AgentConnectForm } from '../../../components/settings/AgentConnectForm'
import { loginKinds } from '../../../fixtures/logins'
import { paths } from '../../../paths'
import {
  agentKeySchema,
  endpointEntrySchema,
  signInStepSchema,
} from './loginSchemas'

/** The form that connects an agent, registered with Mokly. */
export const agentConnectForm = defineComponent({
  slug: 'agent-connect-form',
  title: 'Agent connect form',
  description:
    'The form that connects an agent, open under its row. Its switch chooses the kind of the login: a subscription token, an API key, or an own endpoint for Claude, and an API key, the ChatGPT plan, or an own endpoint for Codex. A secret has its field, with the hint that the app keeps it encrypted, and Connect. The ChatGPT plan has the steps of its sign-in. Cancel shows when the form can close. The form of an org login offers only an API key and an own endpoint, and asks for a key of the account of the org. A form that replaces a connected login says Replace, and a save that failed shows its cause in a notice over the buttons. Its own page shows the subscription token of Claude.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['agent', 'connectTo', 'cancel'],
    properties: {
      agent: agentKeySchema,
      /** The kind that the switch selects, by default the first of the agent. */
      kind: { enum: loginKinds },
      /** The screen that Connect, or the button that gets a code, leads to. */
      connectTo: { type: 'string', minLength: 1 },
      /** The form can close, so it shows Cancel. */
      cancel: { type: 'boolean' },
      /** The step of the ChatGPT sign-in, when the switch selects it. */
      signIn: signInStepSchema,
      /** The own endpoint kind, and what its address field holds. */
      endpoint: endpointEntrySchema,
      /** The org of an org login, such as `Acme`. */
      org: { type: 'string', minLength: 1 },
      /** The form replaces a connected login, so it says Replace. */
      replace: { type: 'boolean' },
      /** The cause of a save that failed, over the buttons. */
      failed: { type: 'string' },
    },
  } as const,
  props: { agent: 'claude', connectTo: paths.accountAgents, cancel: true },
  render: (props) => (
    <AgentConnectForm
      agent={props.agent}
      cancel={props.cancel}
      connectTo={props.connectTo}
      endpoint={props.endpoint}
      failed={props.failed}
      kind={props.kind}
      org={props.org}
      replace={props.replace}
      signIn={props.signIn}
    />
  ),
  variants: [
    {
      slug: 'api-key',
      title: 'API key',
      description: 'The API key of Codex, with the link to make one on OpenAI.',
      props: { agent: 'codex', kind: 'api-key' },
    },
    {
      slug: 'chatgpt',
      title: 'ChatGPT plan',
      description:
        'The ChatGPT plan of Codex, with the steps of its sign-in in place of a field.',
      props: {
        agent: 'codex',
        kind: 'token',
        connectTo: paths.connectCodexChatGptCode,
        signIn: 'start',
      },
    },
    {
      slug: 'endpoint',
      title: 'Own endpoint',
      description:
        'The own endpoint of Claude with a typed address that the shared rule changes before the save.',
      props: {
        kind: 'endpoint',
        endpoint: 'typed',
        connectTo: paths.ownEndpointConnected,
      },
    },
    {
      slug: 'first-run',
      title: 'Next step',
      description:
        'The form of Claude as the next step of Get started, which cannot close.',
      props: { cancel: false, connectTo: paths.getStartedConnected },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import { LoginEndpoint } from '../../../../../../src/ui/components/settings/LoginEndpoint'
import { loginLabels } from '../../../../../../src/ui/components/settings/agentConnectCopy'
import { endpointHost } from '../../../fixtures/logins'

/**
 * The kind of an own endpoint login with the host of its endpoint,
 * registered with Mokly.
 */
export const loginEndpoint = defineComponent({
  slug: 'login-endpoint',
  title: 'Login endpoint',
  description:
    'The kind of a connected own endpoint login with the host of its endpoint, under the row of the login, such as "Own endpoint at proxy.example.com". The host says where the requests of the agent go. The account never shows the key or the full address. Its own page shows the endpoint of Claude.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'host'],
    properties: {
      /** The label of the kind of the login. */
      kind: { type: 'string' },
      host: { type: 'string' },
    },
  } as const,
  props: { kind: loginLabels.claude.endpoint, host: endpointHost },
  render: (props) => <LoginEndpoint host={props.host} kind={props.kind} />,
})

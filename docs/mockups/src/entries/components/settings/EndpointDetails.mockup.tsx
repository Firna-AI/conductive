import { defineComponent } from '@mokly/mokly'
import { EndpointDetails } from '../../../components/settings/EndpointDetails'
import {
  keptModelCheck,
  proxyModelCheck,
} from '../../../fixtures/endpointModels'
import { endpointHost } from '../../../fixtures/logins'
import {
  agentKeySchema,
  endpointLoginSchema,
  loginOwnerSchema,
} from './loginSchemas'

/** The own endpoint login of Cal's proxy, before any read of its list. */
const login = { kind: 'endpoint', host: endpointHost } as const

/** The lines under the row of an own endpoint login, registered with Mokly. */
export const endpointDetails = defineComponent({
  slug: 'endpoint-details',
  title: 'Endpoint details',
  description:
    'The lines under the row of an own endpoint login: its kind with the host of its endpoint, the note after a save that added /v1, the warning after a read of the model list that failed, and the models of the app that the last list leaves out. The row has one Refresh: beside the warning after a failed read, or else beside the models. The Agents tab of the org settings draws an org endpoint with the same lines, whose model line names the pickers on the login, and a person who cannot change the login sees only the kind and the host. Its own page shows the endpoint of Claude.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['agent', 'login'],
    properties: {
      agent: agentKeySchema,
      login: endpointLoginSchema,
      /** Who owns the login: a member, or the org. */
      owner: loginOwnerSchema,
      /** Only the kind and the host, for a person who cannot change it. */
      readOnly: { type: 'boolean' },
    },
  } as const,
  props: { agent: 'claude', login },
  render: (props) => (
    <EndpointDetails
      agent={props.agent}
      login={props.login}
      owner={props.owner}
      readOnly={props.readOnly}
    />
  ),
  variants: [
    {
      slug: 'unlisted',
      title: 'Models left out',
      description:
        'The list of the proxy lacks a Claude model of the app: the models with Refresh.',
      props: { login: { ...login, models: proxyModelCheck } },
    },
    {
      slug: 'read-failed',
      title: 'Read failed',
      description:
        'The last read of the list failed: the warning with Refresh.',
      props: { login: { ...login, readFailed: true } },
    },
    {
      slug: 'read-failed-unlisted',
      title: 'Read failed, models kept',
      description:
        'A failed read keeps the last list: the warning holds Refresh, and the models show without it.',
      props: {
        login: { ...login, models: keptModelCheck, readFailed: true },
      },
    },
    {
      slug: 'v1-added',
      title: '/v1 added',
      description: 'A Codex save that added /v1 to the address: the note.',
      props: { agent: 'codex', login: { ...login, addedV1: true } },
    },
  ],
})

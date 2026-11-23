import { defineComponent } from '@mokly/mokly'
import { productName } from '../../../../../../src/shared/brand'
import { EndpointFields } from '../../../components/settings/EndpointFields'
import { agentKeySchema, endpointEntrySchema } from './loginSchemas'

/** The hint under the key, as the Connect form gives it. */
const keyHint = `${productName} keeps it encrypted, and never shows it again.`

/** The fields of an own endpoint login, registered with Mokly. */
export const endpointFields = defineComponent({
  slug: 'endpoint-fields',
  title: 'Endpoint fields',
  description:
    'The fields of an own endpoint login in the Connect form: what the endpoint must serve, with the models that the picker offers, its address, and its key. The hint of the address names the exact address of the requests, and a refusal of the address takes its place. Its own page shows the empty fields of Claude.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['agent', 'entry', 'keyHint'],
    properties: {
      agent: agentKeySchema,
      /** What the address field holds. */
      entry: endpointEntrySchema,
      /** The hint under the key. */
      keyHint: { type: 'string' },
    },
  } as const,
  props: { agent: 'claude', entry: 'empty', keyHint },
  render: (props) => (
    <EndpointFields
      agent={props.agent}
      entry={props.entry}
      keyHint={props.keyHint}
    />
  ),
  variants: [
    {
      slug: 'typed',
      title: 'Address typed',
      description:
        'A typed address of Codex that the shared rule changes before the save: the hint first names the address that the form saves.',
      props: { agent: 'codex', entry: 'typed' },
    },
    {
      slug: 'refused',
      title: 'Address refused',
      description:
        'An address that the rule refuses: its cause takes the place of the hint, and the key stays in its field.',
      props: { entry: 'refused' },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import {
  EndpointAddressNote,
  EndpointReadFailed,
} from '../../../../../../src/ui/components/settings/EndpointRead'
import { endpointReadCopy as copy } from '../../../../../../src/ui/components/settings/endpointReadCopy'
import { agents } from '../../../fixtures/agents'
import { actionButton } from '../common/actions.mockup'

/** The note after a save that added `/v1`, registered with Mokly. */
export const endpointAddressNote = defineComponent({
  slug: 'endpoint-address-note',
  title: 'Endpoint address note',
  description:
    'The note under the host of a Codex own endpoint login after a save that added /v1 to the typed address, because only that address lists the models. The page keeps it until it reloads.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <EndpointAddressNote />,
})

/**
 * The warning after a read of the model list that failed, registered with
 * Mokly. The row supplies its Refresh in the `refresh` slot.
 */
export const endpointReadFailed = defineComponent({
  slug: 'endpoint-read-failed',
  title: 'Endpoint read failed',
  description:
    'The warning under the host of an own endpoint login after a save or a Refresh whose read of the model list failed, then the Refresh of the login, which lines up with Remove. Its own page shows the warning without Refresh.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['refresh'],
  render: (props) => <EndpointReadFailed refresh={props.refresh} />,
  variants: [
    {
      slug: 'refresh',
      title: 'With Refresh',
      description: 'The warning with the Refresh of the login of Claude.',
      props: {},
      slots: {
        refresh: (
          <actionButton.Component
            accessibilityLabel={copy.refreshLabel(agents.claude.name)}
            icon="refresh-cw"
          >
            {copy.refresh}
          </actionButton.Component>
        ),
      },
    },
  ],
})

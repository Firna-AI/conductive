import { defineComponent } from '@mokly/mokly'
import { PortMessage, ServerList } from '../../../components/tools/PortForm'
import { portFormCopy } from '../../../../../../src/ui/components/tools/previewCopy'
import { detectedServers, openPort } from '../../../fixtures/previews'

/** A server that the runner detects, as `ListeningPort`. */
export const serverSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['port', 'name', 'folder'],
  properties: {
    port: { type: 'integer', minimum: 1 },
    name: { type: ['string', 'null'] },
    folder: { type: ['string', 'null'] },
  },
} as const

/**
 * The port form with the servers of the sandbox, registered with Mokly.
 * Its pages show the servers that the runner detects, and the row of the
 * Preview tab that shows on desktop. A screen supplies the services of the
 * report in the `services` slot, above the servers.
 */
export const serverList = defineComponent({
  slug: 'server-list',
  title: 'Server list',
  description:
    'The port form of the Preview tool with the servers of the sandbox: a button for each server with its port, its name, and its folder, then the smaller Other port row. A folder that does not fit keeps its end. The list scrolls when it does not fit. On desktop a click shows the Preview tab of the port, and the row of the shown tab is the current one. Its own page shows the servers that the runner detects.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['servers'],
    properties: {
      servers: { type: 'array', items: serverSchema },
      /** The port of the Preview tab that shows on desktop, or null. */
      current: { type: ['integer', 'null'] },
    },
  } as const,
  slots: ['services'],
  props: { servers: detectedServers },
  render: (props) => (
    <ServerList
      current={props.current}
      servers={props.servers}
      services={props.services}
    />
  ),
  variants: [
    {
      slug: 'current',
      title: 'Shown tab',
      description:
        'On desktop, the row of the port whose Preview tab shows is the current one.',
      props: { current: openPort },
    },
  ],
})

/**
 * The port form without a list, registered with Mokly. Its page shows the
 * message for a runner that reports no server.
 */
export const portMessage = defineComponent({
  slug: 'port-message',
  title: 'Port message',
  description:
    'The port form of the Preview tool without a list: the port field and Open preview under a short message. The message asks for a server when the runner reports none. Its own page shows that message.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['body'],
    properties: { body: { type: 'string' } },
  } as const,
  props: { body: portFormCopy.noServers },
  render: (props) => <PortMessage body={props.body} />,
})

import { defineComponent } from '@mokly/mokly'
import { PortMessage, ServerList } from '../../../components/tools/PortForm'
import { portFormCopy } from '../../../components/tools/previewCopy'
import { detectedServers } from '../../../fixtures/previews'

/** A server that the runner detects, as `ListeningPort`. */
const serverSchema = {
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
 * Its page shows the servers that the runner detects.
 */
export const serverList = defineComponent({
  slug: 'server-list',
  title: 'Server list',
  description:
    'The port form of the Preview tool with the servers of the sandbox: a button for each server with its port, its name, and its folder, then the smaller Other port row. A folder that does not fit keeps its end. The list scrolls when it does not fit. Its own page shows the servers that the runner detects.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['servers'],
    properties: { servers: { type: 'array', items: serverSchema } },
  } as const,
  props: { servers: detectedServers },
  render: (props) => <ServerList servers={props.servers} />,
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

import { defineComponent } from '@mokly/mokly'
import { PreviewTabs } from '../../../components/tools/PreviewTabs'
import {
  previewTabLabel,
  serverDescription,
} from '../../../../../../src/ui/components/tools/previewCopy'
import {
  detectedServers,
  openPort,
  openPorts,
} from '../../../fixtures/previews'
import { paths } from '../../../paths'

/** The tab of each open preview, with the server of its port. */
const openTabs = openPorts.map((port) => {
  const server = detectedServers.find((each) => each.port === port)
  return {
    label: previewTabLabel(port, server),
    ...(server ? { title: serverDescription(server) } : {}),
    to: paths.preview,
    selected: port === openPort,
  }
})

/**
 * The tabs of the open previews, registered with Mokly. Its pages show the
 * two open previews, and a row that clips its tabs at the end.
 */
export const previewTabs = defineComponent({
  slug: 'preview-tabs',
  title: 'Preview tabs',
  description:
    'The tabs of the open previews of the Preview tool. Each tab is a link to its preview, with the port and the cut name of its server, and its Close button beside its label. The tooltip gives the whole name and the folder. A row that clips its tabs fades at its end. Its own page shows two open previews.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tabs'],
    properties: {
      tabs: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'to', 'selected'],
          properties: {
            /** The port and the cut name of the server. */
            label: { type: 'string' },
            /** The tooltip: the whole name and the folder. */
            title: { type: 'string' },
            to: { type: 'string', minLength: 1 },
            selected: { type: 'boolean' },
          },
        },
      },
      /** The row clips its tabs at its end. */
      fadeEnd: { type: 'boolean' },
    },
  } as const,
  props: { tabs: openTabs },
  render: (props) => <PreviewTabs fadeEnd={props.fadeEnd} tabs={props.tabs} />,
  variants: [
    {
      slug: 'clipped',
      title: 'Clipped',
      description: 'A row that clips its tabs fades at its end.',
      props: { fadeEnd: true },
    },
  ],
})

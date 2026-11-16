import { defineComponent } from '@mokly/mokly'
import {
  PreviewTool,
  previewStates,
} from '../../../components/tools/PortPreview'

/**
 * The Preview tool of the tools panel, registered with Mokly. Its pages
 * show an open preview, the servers after +, the detected servers, no
 * server, and the list after a failed repair.
 */
export const previewTool = defineComponent({
  slug: 'preview-tool',
  title: 'Preview tool',
  description:
    'The Preview tool: the tabs of the open previews with +, a preview in its frame with Reload and a link to a new tab, or the port form. With no preview open, the form lists the servers that the runner detects, or says that it reports none. After a failed repair of the list, the form keeps its last list under a notice. Its own page shows an open preview.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: { state: { enum: previewStates } },
  } as const,
  props: { state: 'open' },
  render: (props) => <PreviewTool state={props.state} />,
  variants: [
    {
      slug: 'adding',
      title: 'Another port',
      description:
        'After +, no tab is current, and the form lists the servers without a preview.',
      props: { state: 'adding' },
    },
    {
      slug: 'detected',
      title: 'Servers detected',
      description: 'No preview is open, and the form lists the servers.',
      props: { state: 'detected' },
    },
    {
      slug: 'no-servers',
      title: 'No servers',
      description: 'The runner reports no server.',
      props: { state: 'no-servers' },
    },
    {
      slug: 'repair-failed',
      title: 'Repair failed',
      description:
        'A repair of the list failed, so the form keeps its last list under a notice.',
      props: { state: 'repair-failed' },
    },
  ],
})

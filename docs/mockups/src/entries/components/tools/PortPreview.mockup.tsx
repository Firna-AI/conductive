import { defineComponent } from '@mokly/mokly'
import {
  PreviewTool,
  previewStates,
} from '../../../components/tools/PortPreview'
import { openPort } from '../../../fixtures/previews'
import { serverSchema } from './PortForm.mockup'

/**
 * The Preview tool of the tools panel, registered with Mokly. Its pages
 * show open previews, the servers after +, the detected servers, no
 * server, and the list after a failed repair. A phone draws the preview in
 * a frame of the tool, so a screen passes `frame`, and a page of the part
 * follows its own view. A screen supplies the services of the report in
 * the `services` slot, and the servers beside them as `servers`.
 */
export const previewTool = defineComponent({
  slug: 'preview-tool',
  title: 'Preview tool',
  description:
    'The Preview tool. On a phone it shows the tabs of the open previews with +, and a preview in its frame with Reload and a link to a new tab. On desktop each port has its own Preview tab in the centre row, so the tool lists each port, and the row of the shown tab is the current one. With no preview open, the form lists the servers that the runner detects, or says that it reports none. After a failed repair of the list, the form keeps its last list under a notice. Its own page shows open previews.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: {
      state: { enum: previewStates },
      /**
       * The page shows in a frame of the tool, as on a phone. Without it, a
       * page of the part follows its own view.
       */
      frame: { type: 'boolean' },
      /** The port of the Preview tab that shows on desktop, or null. */
      shownPort: { type: ['integer', 'null'] },
      /**
       * The servers beside the `services` slot: each server that no service
       * holds. Without it, the list shows its servers as with no services.
       */
      servers: { type: 'array', items: serverSchema },
    },
  } as const,
  slots: ['services'],
  props: { state: 'open', shownPort: openPort },
  render: (props, context) => (
    <PreviewTool
      frame={props.frame ?? context.viewport === 'mobile'}
      services={
        props.services === undefined
          ? undefined
          : { section: props.services, servers: props.servers }
      }
      shownPort={props.shownPort ?? null}
      state={props.state}
    />
  ),
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

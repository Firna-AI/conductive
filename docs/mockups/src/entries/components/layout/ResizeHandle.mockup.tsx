import { defineComponent } from '@mokly/mokly'
import {
  filesShare,
  ResizeHandle,
  rightColumnWidth,
  sidebarWidth,
} from '../../../../../../src/ui/components/layout/ResizeHandle'

/**
 * The handle on the inner edge of a panel that the person can resize,
 * registered with Mokly. At rest it is a hairline, so its pages show the
 * handle that the person drags too.
 */
export const resizeHandle = defineComponent({
  slug: 'resize-handle',
  title: 'Resize handle',
  description:
    'The handle on the inner edge of a resizable panel, such as the sidebar and the right column, and on the top edge of the tools panel. It is a hairline at rest. On hover, on focus, and while the person drags, the hairline brightens and a grip in the accent shows in its middle. Its own page shows the handle of the sidebar at rest.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'edge', 'width'],
    properties: {
      label: { type: 'string' },
      /** The edge of the panel that the handle sits on. */
      edge: { enum: ['left', 'right', 'top'] },
      /** The width of the panel in px, or its share in percent, and its range. */
      width: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'min', 'max'],
        properties: {
          value: { type: 'number' },
          min: { type: 'number' },
          max: { type: 'number' },
        },
      },
      /** The person drags the handle now. */
      active: { type: 'boolean' },
    },
  } as const,
  props: { label: 'Resize the sidebar', edge: 'right', width: sidebarWidth },
  render: (props) => (
    <ResizeHandle
      active={props.active}
      edge={props.edge}
      label={props.label}
      width={props.width}
    />
  ),
  variants: [
    {
      slug: 'active',
      title: 'Dragged',
      description: 'The handle of the sidebar while the person drags it.',
      props: { active: true },
    },
    {
      slug: 'left',
      title: 'Right column',
      description: 'The handle on the left edge of the right column, dragged.',
      props: {
        label: 'Resize the right column',
        edge: 'left',
        width: rightColumnWidth,
        active: true,
      },
    },
    {
      slug: 'top',
      title: 'Tools panel',
      description:
        'The handle on the top edge of the tools panel, which moves the split of the right column, dragged.',
      props: {
        label: 'Resize the files and the tools',
        edge: 'top',
        width: filesShare,
        active: true,
      },
    },
  ],
})

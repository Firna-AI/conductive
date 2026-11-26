import { defineComponent } from '@mokly/mokly'
import { PictureZoomBar } from '../../../components/files/PictureZoomBar'
import { paths } from '../../../paths'

/**
 * The zoom bar under the picture of an image file, registered with Mokly.
 * Its own page shows the bar of a fitted screenshot in the tab of desktop.
 */
export const pictureZoomBar = defineComponent({
  slug: 'picture-zoom-bar',
  title: 'Picture zoom bar',
  description:
    'The bar under the picture of an image file: Zoom out, the zoom as a percentage of the own size of the picture, Zoom in, Fit, and Expand. Zoom out and Fit are off while the picture fits. Zoom in is off at the largest zoom, eight times the own size. Expand shows only in the tab on desktop. The expanded window has the bar without Expand, as app/files/image/expanded shows.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['scale', 'fitted'],
    properties: {
      /** The scale of the picture: 1 is its own size. */
      scale: { type: 'number', minimum: 0.01 },
      fitted: { type: 'boolean' },
      largest: { type: 'boolean' },
      /** The bar is in the tab on desktop, so it has Expand. */
      expand: { type: 'boolean' },
      /** The screen of the picture in its large window, which Expand shows. */
      expandTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: {
    scale: 0.3,
    fitted: true,
    expand: true,
    expandTo: paths.imageExpanded,
  },
  render: (props) => (
    <PictureZoomBar
      expand={props.expand}
      expandTo={props.expandTo}
      fitted={props.fitted}
      largest={props.largest}
      scale={props.scale}
    />
  ),
  variants: [
    {
      slug: 'zoomed',
      title: 'Zoomed',
      description:
        'The picture shows at its own size, so Zoom out and Fit are on.',
      props: { scale: 1, fitted: false },
    },
    {
      slug: 'largest',
      title: 'Largest zoom',
      description:
        'The picture shows at eight times its own size, so Zoom in is off.',
      props: { scale: 8, fitted: false, largest: true },
    },
  ],
})

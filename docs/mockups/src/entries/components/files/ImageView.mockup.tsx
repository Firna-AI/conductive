import { defineComponent } from '@mokly/mokly'
import { ImageView } from '../../../components/files/ImageView'
import { CheckoutPicture, screenshotSize } from '../../../fixtures/pictures'
import { inPlace, placeHeightSchema } from '../common/ownPages'

/**
 * The picture of an image file in its tab, registered with Mokly. The tab
 * supplies the drawing of the picture, so the own page shows the frame of
 * the picture without one. The picture fits the height of the tab, so its
 * own pages give it a place of a fixed height.
 */
export const imageView = defineComponent({
  slug: 'image-view',
  title: 'Image view',
  description:
    'The picture of an image file in its tab, in the middle of the tab. It keeps its proportions and shows at its own size, or smaller, so that it fits the tab. The tab supplies the drawing of the picture, so its own page shows the place of a picture without one.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['size'],
    properties: {
      /** The size of the picture in CSS px, as its image file gives it. */
      size: {
        type: 'object',
        additionalProperties: false,
        required: ['width', 'height'],
        properties: {
          width: { type: 'number', minimum: 1 },
          height: { type: 'number', minimum: 1 },
        },
      },
      placeHeight: placeHeightSchema,
    },
  } as const,
  slots: ['children'],
  props: { size: screenshotSize, placeHeight: 480 },
  render: (props) =>
    inPlace(
      <ImageView size={props.size}>{props.children}</ImageView>,
      props.placeHeight,
    ),
  variants: [
    {
      slug: 'screenshot',
      title: 'Screenshot',
      description: 'A screenshot of the checkout form on a phone.',
      props: {},
      slots: {
        children: <CheckoutPicture label="postcode-overlap.png" overlap />,
      },
    },
  ],
})

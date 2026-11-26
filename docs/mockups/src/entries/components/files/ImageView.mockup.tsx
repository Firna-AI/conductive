import { defineComponent } from '@mokly/mokly'
import { ImageView } from '../../../../../../src/ui/components/files/ImageView'
import { CheckoutPicture, screenshotSize } from '../../../fixtures/pictures'
import { inPlace, placeHeightSchema } from '../common/ownPages'
import { pictureZoomBar } from './PictureZoomBar.mockup'

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
    'The picture of an image file in its tab, in the middle of the stage over the zoom bar. It keeps its proportions and fits: it shows at its own size, or smaller, so that it fits the stage. The wheel, a pinch, the zoom bar, and a double press zoom it, and a drag moves a zoomed picture. The tab supplies the drawing of the picture, so its own page shows the place of a picture without one.',
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
      /** A zoomed picture: its scale, and its move from the middle. */
      zoom: {
        type: 'object',
        additionalProperties: false,
        required: ['scale', 'x', 'y'],
        properties: {
          scale: { type: 'number', minimum: 0.01 },
          x: { type: 'number' },
          y: { type: 'number' },
        },
      },
      movable: { type: 'boolean' },
      placeHeight: placeHeightSchema,
    },
  } as const,
  slots: ['children', 'bar'],
  props: { size: screenshotSize, placeHeight: 480 },
  render: (props) =>
    inPlace(
      <ImageView
        bar={props.bar}
        movable={props.movable}
        size={props.size}
        zoom={props.zoom}
      >
        {props.children}
      </ImageView>,
      props.placeHeight,
    ),
  variants: [
    {
      slug: 'screenshot',
      title: 'Screenshot',
      description:
        'A screenshot of the checkout form on a phone, fitted to the stage, with its zoom bar.',
      props: {},
      slots: {
        children: (
          <CheckoutPicture label="postcode-overlap.png" view="covered" />
        ),
        bar: (
          <pictureZoomBar.Component
            fitted
            moklyInstance="picture-zoom-bar"
            scale={0.26}
          />
        ),
      },
    },
    {
      slug: 'zoomed',
      title: 'Zoomed screenshot',
      description:
        'The wheel zoomed the screenshot to its own size about the postcode field. The stage cuts the picture, and a drag moves it.',
      props: { zoom: { scale: 1, x: 0, y: 260 }, movable: true },
      slots: {
        children: (
          <CheckoutPicture label="postcode-overlap.png" view="covered" />
        ),
        bar: (
          <pictureZoomBar.Component
            fitted={false}
            moklyInstance="picture-zoom-bar"
            scale={1}
          />
        ),
      },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import {
  ScreenCapture,
  ScreenFrame,
  type FrameDevice,
} from '../../../components/marketing/ScreenFrame'

/** The frames of a picture, as `FrameDevice` lists them. */
const frameDevices = [
  'window',
  'excerpt',
  'phone',
] as const satisfies readonly FrameDevice[]

/** A size in CSS px, as `ScreenSize`. */
const sizeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['width', 'height'],
  properties: { width: { type: 'number' }, height: { type: 'number' } },
} as const

/** A rectangle of a screen, in CSS px of the screen, as `ScreenCrop`. */
const cropSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['x', 'y', 'width', 'height'],
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
  },
} as const

/** The data of a capture: what it shows, its screen size, and its crop. */
const captureProperties = {
  /** What the picture shows, for assistive technology. */
  label: { type: 'string' },
  size: sizeSchema,
  crop: cropSchema,
} as const

const desktop = { width: 1440, height: 900 }
const mobile = { width: 390, height: 800 }

/**
 * The frame of a picture of the marketing pages, registered with Mokly. The
 * page supplies the screen in the `screen` slot, and the key of the picture
 * names the frame. So each picture is its own Mokly instance scope, and the
 * parts of two pictures of the same screen keep their own names.
 *
 * These pages show each frame without a screen. A real screen here would
 * give the frame the CSS rules of every part in that screen.
 */
export const screenFrame = defineComponent({
  slug: 'screen-frame',
  title: 'Screen frame',
  description:
    'A real screen of the app as a picture of the marketing pages: laid out at its own size, then scaled and cropped, in a large window, a quiet excerpt, or a phone. The page supplies the screen, so these pages show the frame without one.',
  relatedDocs: ['docs/mockups/marketing-site.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['device', 'picture'],
    properties: {
      device: { enum: frameDevices },
      picture: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'size', 'crop', 'scale'],
        properties: {
          ...captureProperties,
          /** A factor of its CSS px, or `inherit` for `--frame-scale`. */
          scale: { anyOf: [{ type: 'number' }, { const: 'inherit' }] },
        },
      },
    },
  } as const,
  slots: ['screen'],
  props: {
    device: 'window',
    picture: {
      label: 'A screen of the app in a large window',
      size: desktop,
      crop: { x: 0, y: 0, ...desktop },
      scale: 0.3,
    },
  },
  render: (props) => (
    <ScreenFrame
      device={props.device}
      picture={{ ...props.picture, screen: props.screen }}
    />
  ),
  variants: [
    {
      slug: 'excerpt',
      title: 'Excerpt',
      description: 'A quiet excerpt of one part of a screen.',
      props: {
        device: 'excerpt',
        picture: {
          label: 'One part of a screen of the app',
          size: desktop,
          crop: { x: 0, y: 0, width: 720, height: 450 },
          scale: 0.5,
        },
      },
    },
    {
      slug: 'phone',
      title: 'Phone',
      description: 'A phone around a phone screen, with its notch.',
      props: {
        device: 'phone',
        picture: {
          label: 'A screen of the app on a phone',
          size: mobile,
          crop: { x: 0, y: 0, ...mobile },
          scale: 0.5,
        },
      },
    },
  ],
})

/**
 * The capture of a picture, registered with Mokly: the part of the screen
 * at its own size, without a frame. The capture page supplies the screen,
 * and the key of the picture names the capture.
 */
export const screenCapture = defineComponent({
  slug: 'screen-capture',
  title: 'Screen capture',
  description:
    'The part of the screen of a marketing picture at its own size, without a frame, as the capture command saves it. The capture page supplies the screen, so this page shows the capture without one.',
  relatedDocs: ['docs/mockups/marketing-site.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['picture'],
    properties: {
      picture: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'size', 'crop'],
        properties: captureProperties,
      },
    },
  } as const,
  slots: ['screen'],
  props: {
    picture: {
      label: 'One part of a screen of the app at its own size',
      size: desktop,
      crop: { x: 0, y: 0, width: 480, height: 300 },
    },
  },
  render: (props) => (
    <ScreenCapture
      picture={{ ...props.picture, scale: 1, screen: props.screen }}
    />
  ),
})

import { defineComponent } from '@mokly/mokly'
import {
  Lockup,
  LogoTile,
  MacAppIcon,
} from '../../../../../../src/ui/components/brand/Logo'

/** A side of a mark, in px. */
const sizeSchema = { type: 'number', minimum: 1 } as const

/** The tile of the app icon, registered with Mokly. */
export const logoTile = defineComponent({
  slug: 'logo-tile',
  title: 'Logo tile',
  description:
    'The tile of the app icon, where the logo stands alone, such as at the top of the org rail. It scales the master in `docs/brand/`. Its own page shows the tile of the rail, 24 px.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['size'],
    properties: { size: sizeSchema },
  } as const,
  props: { size: 24 },
  render: (props) => <LogoTile size={props.size} />,
})

/** The macOS app icon of the Mac app, registered with Mokly. */
export const macAppIcon = defineComponent({
  slug: 'mac-app-icon',
  title: 'Mac app icon',
  description:
    'The macOS app icon of the Mac app, with its canvas and shadow, as in a notification of macOS. Its own page shows the icon of a notification, 40 px.',
  relatedDocs: ['docs/mockups/mac-app.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['size'],
    properties: { size: sizeSchema },
  } as const,
  props: { size: 40 },
  render: (props) => <MacAppIcon size={props.size} />,
})

/**
 * The lockup of the product, registered with Mokly: the tile and the name,
 * in the version of the colour scheme.
 */
export const lockup = defineComponent({
  slug: 'lockup',
  title: 'Lockup',
  description:
    'The lockup: the tile and the name of the product, with dark text in the light scheme and light text in the dark. It is the name of the product for assistive technology. Its own page shows it at the height of the lockup token.',
  relatedDocs: ['docs/mockups/marketing-site.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** A height in px other than the lockup token, such as in a top bar. */
      height: sizeSchema,
    },
  } as const,
  render: (props) => <Lockup height={props.height} />,
})

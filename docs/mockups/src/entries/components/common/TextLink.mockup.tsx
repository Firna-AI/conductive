import { defineComponent } from '@mokly/mokly'
import { newTabAnchor } from '../chat/WebLinkText.mockup'
import { ScreenLink } from '../../../components/common/ScreenLink'
import {
  TextLink,
  type LinkOpener,
} from '../../../../../../src/ui/components/common/TextLink'
import { paths } from '../../../paths'

/**
 * What a press on the link opens: a new tab with its address, or a screen
 * of the catalogue, such as the port preview of a local address.
 */
const opensSchema = {
  anyOf: [
    { const: 'new-tab' },
    {
      type: 'object',
      additionalProperties: false,
      required: ['to'],
      properties: { to: { type: 'string', minLength: 1 } },
    },
  ],
} as const

/** The element that opens the link, as `TextLink` takes it. */
function openerOf(opens: 'new-tab' | { to: string } | undefined, href: string) {
  if (opens === undefined) return undefined
  if (opens === 'new-tab') {
    return (link: LinkOpener) => (
      <newTabAnchor.Component
        className={link.className}
        href={href}
        moklyInstance="anchor"
        title={link.title}
      >
        {link.children}
      </newTabAnchor.Component>
    )
  }
  return (link: LinkOpener) => <ScreenLink {...link} to={opens.to} />
}

/**
 * A link in untrusted text, registered with Mokly. The chat draws its links
 * with the plain part: a link of a message has no key that stays the same,
 * so its instance would have no stable name.
 */
export const textLink = defineComponent({
  slug: 'text-link',
  title: 'Text link',
  description:
    'A link in untrusted text, such as an answer, a sent message, or the Markdown preview of a file: its words in the colour of a link, with an underline. It keeps the font, the size, and the weight of the text around it, and a long link breaks to fit the line. Its title gives the whole address. Without an opener, the link keeps its look and opens nothing, as its own page shows.',
  relatedDocs: ['docs/mockups/design-links.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['address', 'children'],
    properties: {
      /** The address that the link opens. */
      address: { type: 'string', minLength: 1 },
      /** What the link shows: its label, or its address as the text has it. */
      children: { type: 'string' },
      opens: opensSchema,
    },
  } as const,
  props: {
    address: 'https://docs.places.example/v1/guide',
    children: 'the guide of the places API',
  },
  render: (props) => (
    <TextLink
      address={new URL(props.address)}
      opener={openerOf(props.opens, props.address)}
    >
      {props.children}
    </TextLink>
  ),
  variants: [
    {
      slug: 'new-tab',
      title: 'Web link',
      description: 'A link that opens its page in a new tab.',
      props: { opens: 'new-tab' },
    },
    {
      slug: 'local',
      title: 'Local address',
      description: 'A local address, which opens the port preview of its port.',
      props: {
        address: 'http://localhost:3000/checkout',
        children: 'http://localhost:3000/checkout',
        opens: { to: paths.preview },
      },
    },
  ],
})

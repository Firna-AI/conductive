import { defineComponent } from '@mokly/mokly'
import { ExternalLink } from '../../../components/common/ExternalLink'

/**
 * A link that opens a page outside the app in a new tab, registered with
 * Mokly. Its words are the text of `children`.
 */
export const externalLink = defineComponent({
  slug: 'external-link',
  title: 'External link',
  description:
    'A link that opens a page outside the app in a new tab, with a small arrow out of a box after its words. In a picture of a screen it is not a link. Its own page shows Manage access, which opens the GitHub App.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['href', 'children'],
    properties: {
      href: { type: 'string', minLength: 1 },
      /** The words of the link. */
      children: { type: 'string' },
      /** The spoken name, when it differs from the visible words. */
      label: { type: 'string' },
    },
  } as const,
  props: {
    href: 'https://github.com/apps/conductive/installations/new',
    children: 'Manage access',
  },
  render: (props) => (
    <ExternalLink href={props.href} label={props.label}>
      {props.children}
    </ExternalLink>
  ),
})

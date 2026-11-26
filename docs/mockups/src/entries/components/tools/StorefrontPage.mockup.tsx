import { defineComponent } from '@mokly/mokly'
import { StorefrontPage } from '../../../components/tools/StorefrontPage'

/**
 * The checkout page of the shop of the user, registered with Mokly. Its
 * pages show the page in a preview, and the compact page of the desktop
 * stream.
 */
export const storefrontPage = defineComponent({
  slug: 'storefront-page',
  title: 'Storefront page',
  description:
    'The checkout page of the shop of the user, as its dev server serves it: the address field with its suggestions, the city and the postcode, and Continue to payment. The Preview tool shows it in its frame. The compact page fits the browser window of the desktop stream. Its own page shows the page of a preview.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The smaller page of the browser window of the desktop stream. */
      compact: { type: 'boolean' },
    },
  } as const,
  render: (props) => <StorefrontPage compact={props.compact} />,
  variants: [
    {
      slug: 'compact',
      title: 'Compact',
      description: 'The smaller page in the browser of the desktop stream.',
      props: { compact: true },
    },
  ],
})

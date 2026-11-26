import { defineComponent } from '@mokly/mokly'
import { DesktopView } from '../../../components/tools/DesktopView'

/**
 * The Desktop tool, registered with Mokly. It takes no props, so it has
 * only its own page.
 */
export const desktopView = defineComponent({
  slug: 'desktop-view',
  title: 'Desktop view',
  description:
    'The live desktop stream of the sandbox, where agents use a browser, under a Live label. A drawing of a desktop with a browser on the checkout page stands in for the video of the stream.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <DesktopView />,
})

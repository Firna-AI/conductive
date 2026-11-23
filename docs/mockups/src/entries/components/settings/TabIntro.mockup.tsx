import { defineComponent } from '@mokly/mokly'
import { TabIntro } from '../../../../../../src/ui/components/settings/TabIntro'

/**
 * The heading of a settings tab, registered with Mokly. A screen supplies
 * the line about the tab in the `children` slot.
 */
export const tabIntro = defineComponent({
  slug: 'tab-intro',
  title: 'Tab intro',
  description:
    'The heading of a settings tab, with one line about what it holds, such as the Cloud computer tab of the org settings. A screen supplies the line, so its own page shows the heading alone.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: { title: { type: 'string' } },
  } as const,
  slots: ['children'],
  props: { title: 'Cloud computer' },
  render: (props) => <TabIntro title={props.title}>{props.children}</TabIntro>,
  variants: [
    {
      slug: 'line',
      title: 'With its line',
      description: 'The heading with the line about the tab.',
      props: {},
      slots: {
        children:
          'The shared cloud computer of Acme. Every workspace starts from it, with every repository of the org.',
      },
    },
  ],
})

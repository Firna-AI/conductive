import { defineComponent } from '@mokly/mokly'
import { SearchField } from '../../../components/common/SearchField'

/**
 * The search field at the top of a list that it narrows, registered with
 * Mokly.
 */
export const searchField = defineComponent({
  slug: 'search-field',
  title: 'Search field',
  description:
    'The search field at the top of a list that it narrows, such as the repositories of an org, the tabs of the operator, or the Keyboard shortcuts tab: a Firna input with a search icon, in the touch size on a phone. Its own page shows the field without a query.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'placeholder', 'query'],
    properties: {
      label: { type: 'string' },
      placeholder: { type: 'string' },
      /** The text in the field. */
      query: { type: 'string' },
    },
  } as const,
  props: {
    label: 'Search repositories',
    placeholder: 'Search repositories',
    query: '',
  },
  render: (props) => (
    <SearchField
      label={props.label}
      placeholder={props.placeholder}
      query={props.query}
    />
  ),
  variants: [
    {
      slug: 'query',
      title: 'With a query',
      description: 'The field with the text that narrows the list.',
      props: { query: 'web' },
    },
  ],
})

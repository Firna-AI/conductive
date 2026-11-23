import { defineComponent } from '@mokly/mokly'
import {
  EmptyTab,
  NoResults,
} from '../../../../../../src/ui/components/palette/PaletteEmpty'
import { paletteContent } from '../../../components/palette/paletteContent'
import { emptyLine, filters } from '../../../components/palette/paletteFilters'

/** The answer to a query that matches nothing, registered with Mokly. */
export const noResults = defineComponent({
  slug: 'no-results',
  title: 'No results',
  description:
    'The answer to a query that matches nothing, with a hint at what the search finds. The Keyboard shortcuts tab answers in the same way. Its own page shows a search of the palette.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['query', 'hint'],
    properties: { query: { type: 'string' }, hint: { type: 'string' } },
  } as const,
  props: {
    query: paletteContent('no-results', { archivable: false }).query,
    hint: 'Try a workspace name, a branch, or a repository.',
  },
  render: (props) => <NoResults hint={props.hint} query={props.query} />,
})

/** The line of a tab without rows, registered with Mokly. */
export const emptyTab = defineComponent({
  slug: 'empty-tab',
  title: 'Empty tab',
  description:
    'The line of a tab of the palette that has no row to show while the field is empty, such as the Workspaces tab whose filters leave no workspace. Its own page shows that line.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['line'],
    properties: { line: { type: 'string' } },
  } as const,
  props: { line: emptyLine(filters('workspaces-empty')) },
  render: (props) => <EmptyTab line={props.line} />,
})

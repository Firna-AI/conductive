import { defineComponent } from '@mokly/mokly'
import { PaletteStatusPart } from '../../../components/palette/PaletteStatus'
import { paletteContent } from '../../../components/palette/paletteContent'
import { paletteStatusSchema, paletteTabSchema } from './paletteSchemas'

/** The status part of the palette results, registered with Mokly. */
export const paletteStatusPart = defineComponent({
  slug: 'palette-status-part',
  title: 'Palette status part',
  description:
    'The status part, which stands first in the results of the palette in place of the workspace groups: a spinner while their data loads, or the notice of a read that failed, with Try again. Try again shows the tab with its data for an empty field. Its own page shows a workspace list that did not load.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['query', 'tab'],
    properties: {
      status: paletteStatusSchema,
      /** The text of the search field. */
      query: { type: 'string' },
      tab: paletteTabSchema,
    },
  } as const,
  props: { status: 'list-failed', query: '', tab: 'workspaces' },
  render: (props) => (
    <PaletteStatusPart
      query={props.query}
      status={props.status}
      tab={props.tab}
    />
  ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description: 'The spinner while the repository names load for a search.',
      props: {
        status: 'repositories-loading',
        query: paletteContent('search-loading', { archivable: false }).query,
        tab: 'all',
      },
    },
  ],
})

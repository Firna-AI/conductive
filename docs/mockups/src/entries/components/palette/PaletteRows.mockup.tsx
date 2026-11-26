import { defineComponent } from '@mokly/mokly'
import { PaletteResults } from '../../../components/palette/PaletteRows'
import { paletteContent } from '../../../components/palette/paletteContent'
import { openPaletteViews } from '../../../components/palette/paletteViews'
import { paletteContextSchema, paletteKeysSchema } from './paletteSchemas'

/**
 * The results of the command palette, registered with Mokly. Its props
 * are the view of the palette and where it opens, which give its rows, as
 * the palette gives them.
 */
export const paletteResults = defineComponent({
  slug: 'palette-results',
  title: 'Palette results',
  description:
    'The results of the command palette in their groups. The first row is highlighted, so Enter runs it. A workspace shows its list mark, its name, its repository, and the age of its last activity. A command shows its icon, its label, and, on desktop, its key. The status part of data that did not load stands first. A tab without rows shows its empty line, and a query without a match shows Nothing matches. Its own page shows the All tab over the list of Acme.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['view', 'context'],
    properties: {
      /** The view of the palette, which names its tab and its query. */
      view: { enum: openPaletteViews },
      context: paletteContextSchema,
      /** The keys that the command rows show. A phone shows none. */
      keys: paletteKeysSchema,
    },
  } as const,
  props: { view: 'all', context: { archivable: false } },
  render: (props) => (
    <PaletteResults
      content={paletteContent(props.view, props.context)}
      keys={props.keys}
    />
  ),
  variants: [
    {
      slug: 'keys',
      title: 'With keys',
      description:
        'The Actions tab on desktop, where each command row ends with its key.',
      props: {
        view: 'actions',
        keys: { changes: {}, host: 'chrome-mac' },
      },
    },
    {
      slug: 'unavailable',
      title: "List didn't load",
      description:
        'A search whose workspace list did not load: the notice first, then the other groups.',
      props: { view: 'search-unavailable' },
    },
    {
      slug: 'no-results',
      title: 'Nothing matches',
      description: 'A query that matches nothing.',
      props: { view: 'no-results' },
    },
    {
      slug: 'empty',
      title: 'Empty tab',
      description: 'The Workspaces tab whose filters leave no workspace.',
      props: { view: 'workspaces-empty' },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import { CommandPalette } from '../../../components/palette/CommandPalette'
import { openPaletteViews } from '../../../components/palette/paletteViews'
import { viewports } from '../common/viewports'
import { paletteContextSchema } from './paletteSchemas'

/**
 * The command palette, registered with Mokly. A screen that draws a screen
 * of another viewport passes `viewport`. Without it, a page of the palette
 * draws the layout of its own view.
 */
export const commandPalette = defineComponent({
  slug: 'command-palette',
  title: 'Command palette',
  description:
    'The command palette: one search for the workspaces of the org, the actions of the current page, and the settings. A desktop shows it as a dialog near the top of the window, over the dimmed app, and each command row ends with the first key of its command that works there. A phone shows the palette as a page, without keys. Its own page shows the All tab over the list of Acme.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['view', 'context'],
    properties: {
      /** The view of the palette, which names its tab and its query. */
      view: { enum: openPaletteViews },
      context: paletteContextSchema,
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { view: 'all', context: { archivable: false } },
  render: (props, context) => (
    <CommandPalette
      context={props.context}
      view={props.view}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'workspaces',
      title: 'Workspaces tab',
      description: 'The Workspaces tab with its two filters.',
      props: { view: 'workspaces' },
    },
    {
      slug: 'repository-menu',
      title: 'Repository filter',
      description:
        'The menu of the repository filter, below its button on desktop and in a sheet on a phone.',
      props: { view: 'workspaces-repository' },
    },
    {
      slug: 'search',
      title: 'Search',
      description: 'A query that finds workspaces and commands.',
      props: { view: 'search' },
    },
  ],
})

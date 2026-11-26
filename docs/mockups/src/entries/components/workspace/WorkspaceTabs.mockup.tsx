import { defineComponent } from '@mokly/mokly'
import { WorkspaceTabs } from '../../../components/workspace/WorkspaceTabs'
import { viewports } from '../common/viewports'
import { openTabs } from './tabPages'
import { entriesSchema, tabDragSchema, workspaceTabSchema } from './tabSchemas'

/**
 * The tabs of the centre column, registered with Mokly. A screen that
 * draws a screen of another viewport passes `viewport`. Without it, a page
 * of the tabs draws the layout of its own view.
 */
export const workspaceTabs = defineComponent({
  slug: 'workspace-tabs',
  title: 'Workspace tabs',
  description:
    'The tabs of the centre column: the agent sessions and the open files and diffs in the order that the user gave them, + for a new session on the same branch and cloud computer, and the clock of the session history. Every tab closes, and a right click opens its menu. A row whose tabs do not fit scrolls to the tab that it keeps in view, with a fade. On a phone the current tab shrinks too, so that every tab keeps some of its title. Its own page shows the two sessions and the code file of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tabs'],
    properties: {
      tabs: { type: 'array', items: workspaceTabSchema },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
      /** The closed sessions of the history, the last closed first. */
      historyEntries: entriesSchema,
      historyOpen: { type: 'boolean' },
      /** A read-only workspace: no new session, and fewer menu items. */
      readOnly: { type: 'boolean' },
      drag: tabDragSchema,
      /** The key of the tab whose menu is open. */
      menuTab: { type: 'string' },
      /** The key of the tab that shows the rename field. */
      renaming: { type: 'string' },
      /** A row whose tabs do not fit. */
      full: { type: 'boolean' },
    },
  } as const,
  props: { tabs: openTabs },
  render: (props, context) => (
    <WorkspaceTabs
      drag={props.drag}
      full={props.full}
      historyEntries={props.historyEntries}
      historyOpen={props.historyOpen}
      menuTab={props.menuTab}
      readOnly={props.readOnly}
      renaming={props.renaming}
      tabs={props.tabs}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'history',
      title: 'Session history',
      description:
        'The menu of the closed sessions below the clock. A phone shows it as a sheet that the screen draws.',
      props: { historyOpen: true },
    },
    {
      slug: 'drag',
      title: 'Drag',
      description:
        'The code file on its way to the second place: a faint copy, a line, and the lifted tab.',
      props: { drag: { tab: 'code', index: 1 } },
    },
    {
      slug: 'menu',
      title: 'Tab menu',
      description:
        'The menu of the first session below its tab. A phone shows it as a sheet that the screen draws.',
      props: { menuTab: openTabs[0].key },
    },
    {
      slug: 'full',
      title: 'Full row',
      description:
        'A row with more tabs than fit, scrolled to the tab that it keeps in view, with a fade at its end.',
      props: { full: true },
    },
  ],
})

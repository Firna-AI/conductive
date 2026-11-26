import { defineComponent } from '@mokly/mokly'
import { PanelBar } from '../../../../../../src/ui/components/workspace/PanelBar'

/**
 * The bar at the top of a panel, registered with Mokly. A panel supplies
 * its tabs in `children` and its actions in `actions`, so the page shows
 * the bar without them.
 */
export const panelBar = defineComponent({
  slug: 'panel-bar',
  title: 'Panel bar',
  description:
    'The bar at the top of a panel of the right column: its tabs, then its actions at the end. The panel supplies its tabs and its actions, so its own page shows the empty bar.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['children', 'actions'],
  render: (props) => (
    <PanelBar actions={props.actions}>{props.children}</PanelBar>
  ),
})

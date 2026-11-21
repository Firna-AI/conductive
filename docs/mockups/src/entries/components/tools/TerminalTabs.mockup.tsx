import { defineComponent } from '@mokly/mokly'
import { TerminalTabs } from '../../../components/tools/TerminalTabs'
import { paths } from '../../../paths'
import { viewports } from '../common/viewports'
import { terminalTabsProperties } from './terminalSchemas'

/** The terminals Terminal 1 to Terminal 10, at the limit. */
const limit = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * The row of terminal tabs, registered with Mokly. A screen that draws a
 * screen of another viewport passes `viewport`. Without it, a page of the
 * part draws the layout of its own view.
 */
export const terminalTabs = defineComponent({
  slug: 'terminal-tabs',
  title: 'Terminal tabs',
  description:
    'The terminals of a workspace, as a row of tabs above the shown terminal, with + for a new terminal at its end. Each terminal closes, except the last one. At the limit of 10 terminals the + is off, and a line under the row says how to open another. A row whose tabs do not fit scrolls sideways. Its own page shows three terminals with the second one shown.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['numbers', 'shown'],
    properties: {
      ...terminalTabsProperties,
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { numbers: [1, 2, 3], shown: 2, closeTo: paths.closeTerminal },
  render: (props, context) => (
    <TerminalTabs
      atLimit={props.atLimit}
      closeTo={props.closeTo}
      numbers={props.numbers}
      shown={props.shown}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'limit',
      title: 'At the limit',
      description:
        'Ten terminals with the last one shown: the + is off, and the line under the row says how to open another.',
      props: { numbers: limit, shown: 10, atLimit: true },
    },
    {
      slug: 'one',
      title: 'One terminal',
      description: 'The last terminal of a workspace, which cannot close.',
      props: { numbers: [1], shown: 1 },
    },
  ],
})

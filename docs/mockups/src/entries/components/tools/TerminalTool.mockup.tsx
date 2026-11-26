import { defineComponent } from '@mokly/mokly'
import { TerminalTool } from '../../../components/tools/TerminalTool'
import {
  testSession,
  workspacePrompt,
  workspaceSession,
} from '../../../fixtures/terminal'
import { paths } from '../../../paths'
import { viewports } from '../common/viewports'
import {
  sharedSizes,
  terminalLineSchema,
  terminalTabsProperties,
} from './terminalSchemas'

/** Three terminals with the second one shown. */
const threeTabs = {
  numbers: [1, 2, 3],
  shown: 2,
  closeTo: paths.closeTerminal,
}

/**
 * The Terminal tool of the tools panel, registered with Mokly. A screen
 * that draws a screen of another viewport passes `viewport`. Without it, a
 * page of the part draws the layout of its own view.
 */
export const terminalTool = defineComponent({
  slug: 'terminal-tool',
  title: 'Terminal tool',
  description:
    'The Terminal tool: the row of terminal tabs, then the shown terminal. A cloud computer whose software opens one terminal only shows no row. A terminal whose connection ended keeps its output, takes no input, and shows the Disconnected bar with Reconnect under it. Its own page shows three terminals with the tests of the second one.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tabs', 'lines'],
    properties: {
      /** The row of terminal tabs, or null for software with one terminal. */
      tabs: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            additionalProperties: false,
            required: ['numbers', 'shown'],
            properties: terminalTabsProperties,
          },
        ],
      },
      lines: { type: 'array', items: terminalLineSchema },
      /** The prompt after which the cursor waits. */
      prompt: { type: 'string' },
      /** The connection of the terminal ended. */
      disconnected: { type: 'boolean' },
      /** The size that all viewers share, against the panel. */
      shared: { enum: sharedSizes },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { tabs: threeTabs, lines: testSession, prompt: workspacePrompt },
  render: (props, context) => (
    <TerminalTool
      disconnected={props.disconnected}
      lines={props.lines}
      prompt={props.prompt}
      shared={props.shared}
      tabs={props.tabs}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'disconnected',
      title: 'Disconnected',
      description:
        'The connection of the shown terminal ended: its output stays, and the Disconnected bar offers Reconnect.',
      props: { disconnected: true },
    },
    {
      slug: 'one-terminal',
      title: 'One terminal',
      description:
        'The software of an older cloud computer opens one terminal only, so the tool shows no row of tabs.',
      props: { tabs: null, lines: workspaceSession },
    },
  ],
})

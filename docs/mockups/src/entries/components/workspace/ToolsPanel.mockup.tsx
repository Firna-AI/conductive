import { defineComponent } from '@mokly/mokly'
import { ToolsPanel } from '../../../components/workspace/ToolsPanel'
import { toolKeys } from '../../../components/workspace/tools'

/**
 * The desktop panel of the tools, registered with Mokly. A screen supplies
 * the tool in the `children` slot, so these pages show the tabs over an
 * empty body.
 */
export const toolsPanel = defineComponent({
  slug: 'tools-panel',
  title: 'Tools panel',
  description:
    'The desktop panel of the tools in the right column, with a tab for each tool that the app offers: Terminal and Preview. The screen supplies the tool, so its own page shows the tabs with Terminal open over an empty body.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tool'],
    properties: { tool: { enum: toolKeys } },
  } as const,
  slots: ['children'],
  props: { tool: 'terminal' },
  render: (props) => (
    <ToolsPanel tool={props.tool}>{props.children}</ToolsPanel>
  ),
  variants: [
    {
      slug: 'preview',
      title: 'Preview',
      description: 'The tabs with Preview open.',
      props: { tool: 'preview' },
    },
  ],
})

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
    'The desktop panel of the tools in the right column, with a tab for each tool that the app offers: Terminal and Preview. In the phone apps on a tablet, the Preview tab opens the Preview tool of the phone apps. The screen supplies the tool, so its own page shows the tabs with Terminal open over an empty body.',
  relatedDocs: [
    'docs/mockups/catalogue-workspace-tools.md',
    'docs/mockups/phone-app.md',
  ],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tool'],
    properties: {
      tool: { enum: toolKeys },
      /** The tabs of the phone apps, which open their own Preview tool. */
      phoneApp: { type: 'boolean' },
    },
  } as const,
  slots: ['children'],
  props: { tool: 'terminal' },
  render: (props) => (
    <ToolsPanel phoneApp={props.phoneApp} tool={props.tool}>
      {props.children}
    </ToolsPanel>
  ),
  variants: [
    {
      slug: 'preview',
      title: 'Preview',
      description: 'The tabs with Preview open.',
      props: { tool: 'preview' },
    },
    {
      slug: 'phone-app',
      title: 'Phone apps',
      description:
        'The tabs of the phone apps on a tablet, with Preview open. The Preview tab opens the Preview tool of the phone apps, which opens each preview in the in-app browser.',
      props: { tool: 'preview', phoneApp: true },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import { ThisMacSection } from '../../../components/settings/ThisMacSection'

/**
 * The This Mac section of the Mac app, registered with Mokly. The result
 * of the last Remove comes from the state of the Mac app, so these pages,
 * which no Mac app draws, show the section without one.
 */
export const thisMacSection = defineComponent({
  slug: 'this-mac-section',
  title: 'This Mac section',
  description:
    'The Mac that the Mac app registers as a device, on the This Mac tab of the account: its name and its state, the commands that always run on it, each with Remove, and the workspaces whose commands all run without asking, each with the time left and Stop. A long command shows three lines with a fade and Show all. After a Remove, its result shows under the lists. Only the Mac app shows the section.',
  relatedDocs: ['docs/mockups/mac-app.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <ThisMacSection />,
})

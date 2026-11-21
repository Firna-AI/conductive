import { defineComponent } from '@mokly/mokly'
import { TerminalView } from '../../../components/tools/TerminalView'
import {
  hoveredLinkSession,
  testSession,
  workspacePrompt,
} from '../../../fixtures/terminal'
import { sharedSizes, terminalLineSchema } from './terminalSchemas'

/**
 * A terminal session, registered with Mokly. Its pages show a session with
 * a prompt, the keys of a phone, a link under the pointer, and the two
 * shared sizes.
 */
export const terminalView = defineComponent({
  slug: 'terminal-view',
  title: 'Terminal view',
  description:
    'A terminal session in its colours. With a prompt, the cursor waits after it; without one, the cursor follows the output of the running command, and an output that ended has none. A phone adds a row of the keys that its keyboard lacks. A link under the mouse pointer is underlined, with its hint below it. When the size that all viewers share is larger than the panel, the text gets smaller, and when it is smaller, empty space follows the screen. Its own page shows the tests of the workspace at its prompt.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['lines', 'extraKeys'],
    properties: {
      lines: { type: 'array', items: terminalLineSchema },
      /** The prompt after which the cursor waits. */
      prompt: { type: 'string' },
      /** The row of the keys that a phone keyboard lacks. */
      extraKeys: { type: 'boolean' },
      /** The output ended, so the terminal has no cursor. */
      cursor: { type: 'boolean' },
      /** The size that all viewers share, against the panel. */
      shared: { enum: sharedSizes },
    },
  } as const,
  props: { lines: testSession, prompt: workspacePrompt, extraKeys: false },
  render: (props) => (
    <TerminalView
      cursor={props.cursor}
      extraKeys={props.extraKeys}
      lines={props.lines}
      prompt={props.prompt}
      shared={props.shared}
    />
  ),
  variants: [
    {
      slug: 'phone-keys',
      title: 'Phone keys',
      description: 'The row of the keys that a phone keyboard lacks.',
      props: { extraKeys: true },
    },
    {
      slug: 'hovered-link',
      title: 'Link under the pointer',
      description: 'A link of the output under the pointer, with its hint.',
      props: { lines: hoveredLinkSession },
    },
    {
      slug: 'shared-larger',
      title: 'Larger shared size',
      description:
        'Another viewer set a larger size, so the text gets smaller to fit.',
      props: { shared: 'larger' },
    },
    {
      slug: 'shared-smaller',
      title: 'Smaller shared size',
      description:
        'Another viewer set a smaller size, so empty space follows the screen.',
      props: { shared: 'smaller' },
    },
  ],
})

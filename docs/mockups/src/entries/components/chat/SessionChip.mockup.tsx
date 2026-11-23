import { defineComponent } from '@mokly/mokly'
import { SessionChip } from '../../../../../../src/ui/components/chat/SessionChip'
import { workspaceLabel } from '../../../../../../src/ui/components/workspaces/label'
import { savedCarts } from '../../../fixtures/workspaces'
import { paths } from '../../../paths'
import { chipToSchema, openerTo } from './chipOpener'
import { chipSessionSchema, removalSchema } from './chipSchemas'

/** A session of Saved carts. */
const session = {
  workspace: {
    label: workspaceLabel(savedCarts.number),
    status: 'ready',
    github: 'ready-to-merge',
  },
  title: 'Restore saved carts after sign-in',
} as const

/**
 * A session in a line of text, registered with Mokly. The app draws the
 * same chip, so mockup-only parts render the wrapper. Its adapter builds a
 * link to the screen `to`, because a callback is not data.
 */
export const sessionChip = defineComponent({
  slug: 'session-chip',
  title: 'Session chip',
  description:
    'A session in a line of text: the pill of a workspace chip with the list mark and the label of its workspace, then the icon of a session tab and the title of the session. A narrow line cuts the title short. Screen readers hear "Session" before the title. In a sent message a press opens the session. In a message box the chip has the cell of its mark, which a pointer turns into a × that removes it. Its own page shows a session of Saved carts.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['session'],
    properties: {
      session: chipSessionSchema,
      to: chipToSchema,
      /** The chip of a message box, with the cell of its mark. */
      removal: removalSchema,
    },
  } as const,
  props: { session },
  render: (props) => (
    <SessionChip
      opener={openerTo(props.to)}
      removal={props.removal}
      session={props.session}
    />
  ),
  variants: [
    {
      slug: 'link',
      title: 'In a sent message',
      description: 'The chip as a link to the session.',
      props: { to: paths.firstTurn },
    },
    {
      slug: 'removable',
      title: 'In a message box',
      description:
        'The chip in a message box, with the pointer over its mark, so a × takes its place.',
      props: {
        removal: {
          name: `${session.workspace.label} ${session.title}`,
          pointer: true,
        },
      },
    },
  ],
})

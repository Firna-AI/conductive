import { defineComponent } from '@mokly/mokly'
import { WorkspaceChip } from '../../../../../../src/ui/components/chat/WorkspaceChip'
import { workspaceLabel } from '../../../../../../src/ui/components/workspaces/label'
import { savedCarts } from '../../../fixtures/workspaces'
import { paths } from '../../../paths'
import { chipToSchema, openerTo } from './chipOpener'
import { chipWorkspaceSchema, removalSchema } from './chipSchemas'

/** The chip of Saved carts, whose agent works. */
const workspace = {
  label: workspaceLabel(savedCarts.number),
  name: savedCarts.name,
  status: 'working',
  github: 'checks-running',
} as const

/**
 * A workspace in a line of text, registered with Mokly. The app draws the
 * same chip, so mockup-only parts render the wrapper. Its adapter builds a
 * link to the screen `to`, because a callback is not data. A session chip
 * supplies its icon in the `beforeName` slot.
 */
export const workspaceChip = defineComponent({
  slug: 'workspace-chip',
  title: 'Workspace chip',
  description:
    'A workspace in a line of text: a small rounded pill with the list mark of the workspace, its label in a muted colour, and its current name. A narrow line cuts the name short. The name is bold while the workspace has output that the reader has not read. Screen readers also hear the GitHub state and the state of the workspace. In a sent message a press opens the workspace. In a message box the chip has the cell of its mark, which a pointer turns into a × that removes it. Its own page shows a workspace whose agent works.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['workspace'],
    properties: {
      workspace: chipWorkspaceSchema,
      to: chipToSchema,
      /** The chip of a message box, with the cell of its mark. */
      removal: removalSchema,
    },
  } as const,
  slots: ['beforeName'],
  props: { workspace },
  render: (props) => (
    <WorkspaceChip
      beforeName={props.beforeName}
      opener={openerTo(props.to)}
      removal={props.removal}
      workspace={props.workspace}
    />
  ),
  variants: [
    {
      slug: 'unread',
      title: 'Unread',
      description:
        'A workspace with output that the reader has not read, as a link to its screen: its name is bold.',
      props: {
        workspace: { ...workspace, status: 'unread', github: 'ready-to-merge' },
        to: paths.firstTurn,
      },
    },
    {
      slug: 'removable',
      title: 'In a message box',
      description:
        'The chip in a message box, with the pointer over its mark, so a × takes its place.',
      props: {
        removal: {
          name: `${workspace.label} ${workspace.name}`,
          pointer: true,
        },
      },
    },
  ],
})

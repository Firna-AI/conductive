import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const lateTemporary = defineScreen({
  title: 'Late temporary request',
  description:
    'Nobody answered MAPBOX_TOKEN in time, and the turn ended. The request stays at its place in the chat, and its line says that the agent stopped waiting and that Allow sends it a message. On a computer it keeps the value field and the choices, and Allow is off until a value is typed. On a phone it shows Deny and Give a value. The workspace keeps Needs input.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-late-temporary' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'value',
      title: 'A value, later',
      description:
        'Priya opened the workspace later, typed a value, and chose This workspace. On a phone, Give a value opened the sheet with the field, the choice, and Allow. Cal lets other members use his login, so the bar of the composer says "Cal\'s login".',
      props: {
        conversation: 'secret-late-temporary-value',
        viewer: 'member',
        overlay: 'value-sheet',
      },
    },
    {
      slug: 'given',
      title: 'Given later, by another member',
      description:
        'Priya allowed the value for this workspace. The request now says Value for this workspace, and its line says that she answered and that a new turn told the agent. A line of the app follows in the chat: "You gave MAPBOX_TOKEN for this workspace." The new turn runs for Cal, who sent the turn that asked.',
      rationale:
        'Any member who sees the session answers (secrets decision 4 B). A late answer starts a turn that acts for the sender of the turn that asked, and the chat and the text of the agent name the member who answered, never the value (secrets decision 10 B).',
      props: { conversation: 'secret-late-given', viewer: 'member' },
    },
  ],
})

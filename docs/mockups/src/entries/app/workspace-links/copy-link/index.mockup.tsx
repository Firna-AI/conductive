import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const copyLink = defineScreen({
  title: 'Link copied',
  description:
    'In Saved carts, Cal pressed W-402 after the name in the header. The button copied the link of the workspace, and a note under it says "Link copied" for a moment. The label shows alone, without an icon. A pointer over it shows the hover fill of the plain buttons of the header, and the keyboard focus shows their focus ring. On a phone the label leads the line under the name, before the repository and the branch.',
  rationale:
    'The user asked on 9 November 2026 for the label without a link icon, with a hover effect only. The label does not change after a press, so nothing in the header moves. The note names the link, because the button shows the number, and a reader could think that it copied only the number. The note lies over the content under the header, so nothing moves, and screen readers hear it as a status. The link holds no tab, such as an open file, because it names the workspace. On a phone the name keeps its room, and the touch area of the label reaches up over the name to 44 px.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    conversation: 'first-turn',
    banner: 'no-commits',
    copyLink: 'copied',
  },
  useCasePaths: ['user-flows/link-a-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Copy failed',
      description:
        'The copy of the link failed. The label stays as it is, and the note under it says "The link didn\'t copy. Try again." in the danger colour, so Cal presses the label again.',
      rationale:
        'The words follow the copy of a file page, which says "The text didn\'t copy. Try again." The note is a status, as for a copy that worked, so screen readers hear the error too.',
      props: { copyLink: 'failed' },
    },
  ],
})

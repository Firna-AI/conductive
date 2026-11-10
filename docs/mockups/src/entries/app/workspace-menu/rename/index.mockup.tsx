import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const workspaceMenuRename = defineScreen({
  title: 'Rename a workspace',
  description:
    'Rename turns the name of Apple Pay button into a field in its row, with the name selected, so typing replaces it. Enter or a click outside the field saves the name, and Escape keeps the old one. An empty or unchanged name saves nothing. A workspace that shows Untitled starts with an empty field. On a phone the field shows in the row of the list.',
  rationale:
    'The user chose Rename for the menu on 9 November 2026, because the app has no other way to rename a workspace. The field works as the field that renames a section, in its place in the list. The server keeps its rules for a name, and the branch keeps its name.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace-rename', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Rename failed',
      description:
        'The new name, Apple Pay on checkout, did not save, because the app could not reach the server. The field keeps the draft, so Enter tries again, and Escape keeps the old name. A toast names what failed, with the message of the app.',
      rationale:
        'A failed change of the list shows a toast that names it, as a failed move of a workspace or a failed rename of a section does. The field keeps what the user typed, so nothing needs to be typed again.',
      props: { menu: 'workspace-rename-failed' },
    },
  ],
})

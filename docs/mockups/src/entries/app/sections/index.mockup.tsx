import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const sections = defineScreen({
  title: 'Sections',
  description:
    'The menu of a section, open from its button with three dots: Rename, New workspace, New section, and Delete section. New workspace creates the workspace in this section. On a phone the menu opens as a sheet.',
  rationale:
    'A section collapses from its header, and a collapsed section shows how many workspaces it holds. New workspaces from the top of the list join General, the default section. Deleting a section moves its workspaces to General, so no workspace gets lost.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'section' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'drag',
      title: 'Drag a workspace',
      description:
        'A workspace moves to another section by drag and drop. The row lifts under the pointer, a faint copy stays where it was, and a line shows where it lands, here between two rows of General. On a phone a long press lifts the row.',
      props: { menu: 'drag' },
    },
  ],
})

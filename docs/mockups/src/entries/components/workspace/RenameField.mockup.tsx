import { defineComponent } from '@mokly/mokly'
import { nameLabel } from '../../../../../../src/shared/name-label'
import { RenameField } from '../../../components/workspace/RenameField'
import { workspaceSessions } from '../../../fixtures/sessions'

/** The field that renames a session in its tab, registered with Mokly. */
export const renameField = defineComponent({
  slug: 'rename-field',
  title: 'Rename field',
  description:
    'The title of a session as a field, in place of its tab label, after Rename session in the tab menu. The field opens focused, with the title selected, so typing replaces it. Its own page shows the title of the first session.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: { title: { type: 'string' } },
  } as const,
  props: { title: nameLabel(workspaceSessions[0].title) },
  render: (props) => <RenameField title={props.title} />,
})

import { defineComponent } from '@mokly/mokly'
import { EmptyState } from '../../../../../../src/ui/components/common/EmptyState'
import { actionButton } from './actions.mockup'
import { iconKeys, icons } from './icons'

/**
 * The quiet centred message of a view with nothing to show yet, registered
 * with Mokly. A screen supplies its action in the `action` slot.
 */
export const emptyState = defineComponent({
  slug: 'empty-state',
  title: 'Empty state',
  description:
    'A quiet centred message for a view with nothing to show yet: a faint icon, a title, an optional body, and an optional action. Its own page shows the empty Changes list.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['icon', 'title'],
    properties: {
      icon: { enum: iconKeys },
      title: { type: 'string' },
      body: { type: 'string' },
      /** The message is an error, and screen readers announce it. */
      alert: { type: 'boolean' },
    },
  } as const,
  slots: ['action'],
  props: {
    icon: 'file-diff',
    title: 'Changes show here',
    body: 'Files that the agent edits appear as it works.',
  },
  render: (props) => (
    <EmptyState
      action={props.action}
      alert={props.alert}
      body={props.body}
      icon={icons[props.icon]}
      title={props.title}
    />
  ),
  variants: [
    {
      slug: 'with-action',
      title: 'With an action',
      description: 'A file that the preview cannot show, with Download.',
      props: {
        icon: 'file-box',
        title: 'Download this file to open it',
        body: 'It is a binary file.',
      },
      slots: {
        action: <actionButton.Component>Download</actionButton.Component>,
      },
    },
  ],
})

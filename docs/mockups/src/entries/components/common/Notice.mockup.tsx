import { defineComponent } from '@mokly/mokly'
import { Notice } from '../../../../../../src/ui/components/common/Notice'
import { actionButton } from './actions.mockup'
import { iconKeys, icons } from './icons'

/**
 * The notice of the app, registered with Mokly: a short message in a box
 * with a full border and a tinted fill. The body and the action are slots,
 * because a screen supplies them as content. Its pages show a neutral
 * notice, a danger notice with a body and an action, and a notice of work
 * that runs.
 */
export const notice = defineComponent({
  slug: 'notice',
  title: 'Notice',
  description:
    'A short message in a box with a full border and a tinted fill: an icon, a title, an optional body, and an optional action. A danger notice has a rose border and fill. A notice of work that runs shows a spinner in place of its icon. Its own page shows a neutral notice with a title.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['icon', 'title'],
    properties: {
      icon: { enum: iconKeys },
      title: { type: 'string' },
      tone: { enum: ['neutral', 'danger'] },
      /** Work runs: a spinner takes the place of the icon. */
      busy: { type: 'boolean' },
    },
  } as const,
  slots: ['body', 'action'],
  props: { icon: 'hammer', title: 'The cloud computer builds at night' },
  render: (props) => (
    <Notice
      action={props.action}
      body={props.body}
      busy={props.busy}
      icon={icons[props.icon]}
      title={props.title}
      tone={props.tone}
    />
  ),
  variants: [
    {
      slug: 'danger',
      title: 'Danger',
      description:
        'Something failed: a rose notice with the message of the server and Try again.',
      props: {
        icon: 'triangle-alert',
        title: "The workspaces didn't load",
        tone: 'danger',
      },
      slots: {
        body: "The app can't reach the server. Check the connection, then try again.",
        action: (
          <actionButton.Component icon="rotate-cw">
            Try again
          </actionButton.Component>
        ),
      },
    },
    {
      slug: 'busy',
      title: 'Work runs',
      description:
        'A notice of work that runs, such as the first build: a spinner in place of the icon.',
      props: {
        busy: true,
        icon: 'hammer',
        title: 'The first build runs · 2 min',
      },
      slots: { body: 'New workspaces can start when it ends.' },
    },
  ],
})

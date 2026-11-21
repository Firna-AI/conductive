import { defineComponent } from '@mokly/mokly'
import { LoadFailure } from '../../../components/common/LoadFailure'
import { paths } from '../../../paths'

/**
 * Data that did not load, registered with Mokly: a danger notice with the
 * message of the server and Try again. Its notice and its button are
 * registered parts too.
 */
export const loadFailure = defineComponent({
  slug: 'load-failure',
  title: 'Load failure',
  description:
    'Data that did not load, as the lists of the app show it: what failed, the message of the server, and Try again, which loads it again. Its own page shows Try again without a screen to open.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: { type: 'string' },
      /** The screen that shows the data after Try again. */
      to: { type: 'string' },
    },
  } as const,
  props: { title: "The workspaces didn't load" },
  render: (props) => <LoadFailure title={props.title} to={props.to} />,
  variants: [
    {
      slug: 'with-retry',
      title: 'Try again opens the data',
      description: 'Try again links to the screen that shows the data.',
      props: { title: "The invitations didn't load", to: paths.invitations },
    },
  ],
})

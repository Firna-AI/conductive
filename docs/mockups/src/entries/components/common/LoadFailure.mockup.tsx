import { defineComponent } from '@mokly/mokly'
import { LoadFailure } from '../../../components/common/LoadFailure'
import { skillsCopy } from '../../../../../../src/ui/components/settings/skillsCopy'
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
    'Data that did not load, as the lists of the app show it: what failed, the message of the server, and Try again, which loads it again. When the server answered but a service behind it did not, such as GitHub, the message of that service takes the place of the message of the server. Its own page shows Try again without a screen to open.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: { type: 'string' },
      /** The message of a service behind the server that did not answer. */
      body: { type: 'string' },
      /** The screen that shows the data after Try again. */
      to: { type: 'string' },
    },
  } as const,
  props: { title: "The workspaces didn't load" },
  render: (props) => (
    <LoadFailure body={props.body} title={props.title} to={props.to} />
  ),
  variants: [
    {
      slug: 'with-retry',
      title: 'Try again opens the data',
      description: 'Try again links to the screen that shows the data.',
      props: { title: "The invitations didn't load", to: paths.invitations },
    },
    {
      slug: 'service-failed',
      title: 'A service did not answer',
      description:
        'The server answered, but GitHub did not, so the list of skills did not load: the message names GitHub in place of the message of the server.',
      props: { title: skillsCopy.failed.title, body: skillsCopy.failed.body },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import { LinkedLine } from '../../../../../../src/ui/components/chat/LinkedLine'
import { ScreenLink } from '../../../components/common/ScreenLink'
import { linkedSession } from '../../../fixtures/sessions'
import { paths } from '../../../paths'

/**
 * The first line of a linked session, registered with Mokly. A screen
 * supplies the link to the session that opened it.
 */
export const linkedLine = defineComponent({
  slug: 'linked-line',
  title: 'Linked line',
  description:
    'The first line of a linked session, which a message in another session opened because the login of its starter was not available: a link icon, the words, and the link to that session with its title, in the colour of a link. Its own page shows the line without its link.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['link'],
  render: (props) => <LinkedLine link={props.link} />,
  variants: [
    {
      slug: 'link',
      title: 'Link',
      description: 'The line with the link to the session that opened it.',
      props: {},
      slots: {
        link: (
          <ScreenLink to={paths.noStarterLogin}>
            {linkedSession.from.title}
          </ScreenLink>
        ),
      },
    },
  ],
})

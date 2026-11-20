import { defineComponent } from '@mokly/mokly'
import { ChatItemView } from '../../../components/chat/ChatItemView'
import { bullets, item, p } from '../../../fixtures/agentText'
import { autocompleteStart } from '../../../fixtures/autocompleteTurn'
import type { ChatItem } from '../../../fixtures/conversations'
import { changedFiles } from '../../../fixtures/files'
import { personKeys } from '../layout/railSchemas'
import { singleItemSchema } from './chatItemSchemas'

type UserItem = Extract<ChatItem, { kind: 'user' }>

/** The message that starts the turn of Checkout address autocomplete. */
const ask: UserItem = autocompleteStart.find(
  (item): item is UserItem => item.kind === 'user',
) ?? { kind: 'user', id: 'ask', text: '' }

const propSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['item', 'viewer'],
  properties: {
    item: singleItemSchema,
    /** The person signed in, who reads the transcript. */
    viewer: { enum: personKeys },
  },
} as const

type Props = Parameters<typeof ChatItemView>[0]

/**
 * One item of a chat transcript, registered with Mokly. Its pages show a
 * message of a member, an answer, the line of a turn that runs, the end
 * of a turn, and a stopped turn.
 */
export const chatItemView = defineComponent<typeof propSchema, [], Props>({
  slug: 'chat-item-view',
  title: 'Chat item view',
  description:
    'One item of a chat transcript, other than a tool call: a message of a member in its bubble, with its files; an answer of the agent; a command on the Mac; the card of a run with secrets, or a late request with its answer; the line of a late Allow, which starts a turn; the end of a turn; a lost, linked, continued, or stopped line; a failed turn; or the line of a turn that runs. A stopped turn says "You" to the member who pressed Stop. Its own page shows the message that starts a turn.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema,
  props: { item: ask, viewer: 'cal' },
  render: (props) => <ChatItemView item={props.item} viewer={props.viewer} />,
  variants: [
    {
      slug: 'answer',
      title: 'Answer',
      description: 'An answer of the agent with a list.',
      props: {
        item: {
          kind: 'agent',
          id: 'done',
          blocks: [
            p('Done. Checkout now suggests addresses as you type.'),
            bullets(
              item(
                'Choosing a suggestion fills the street, city, and postcode.',
              ),
              item('Opened pull request #482.'),
            ),
          ],
        },
      },
    },
    {
      slug: 'working',
      title: 'Working',
      description: 'The line of a turn that runs, with its time so far.',
      props: { item: { kind: 'working', id: 'working', elapsed: '2m 41s' } },
    },
    {
      slug: 'turn-end',
      title: 'Turn end',
      description: 'The end of a finished turn, with its changed files.',
      props: {
        item: {
          kind: 'turn-end',
          id: 'turn-end',
          duration: '4m 12s',
          files: changedFiles,
        },
      },
    },
    {
      slug: 'stopped',
      title: 'Stopped',
      description: 'A turn that the reader stopped.',
      props: { item: { kind: 'stopped', id: 'stopped', by: 'cal' } },
    },
  ],
})

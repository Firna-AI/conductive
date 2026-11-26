import { defineComponent, type SchemaProps } from '@mokly/mokly'
import { ChatPane } from '../../../components/chat/ChatPane'
import { foldStates } from '../../../components/chat/WorkFold'
import { pictureReads } from '../../../components/chat/chatPictures'
import { plainData } from '../../../defined'
import { defaultChoice } from '../../../fixtures/agents'
import { conversations, type ChatItem } from '../../../fixtures/conversations'
import { creatingLog } from '../../../fixtures/starting'
import { personKeys } from '../layout/railSchemas'
import { viewports } from '../common/viewports'
import {
  sandboxNoticeSchema,
  startingLogSchema,
} from '../workspace/sandboxSchemas'
import { withComposerPanel } from './capabilitiesSlot'
import { chatItemSchema } from './chatItemSchemas'
import { composerStateSchema } from './composerSchemas'

/** An empty message box with the default model. */
const composer = {
  choice: defaultChoice,
  running: false,
  draft: '',
  attachments: [],
} as const

const propSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'composer', 'viewer'],
  properties: {
    items: { type: 'array', items: chatItemSchema },
    composer: composerStateSchema,
    /** The sandbox is not running: its bar, in place of the composer. */
    problem: sandboxNoticeSchema,
    /** The steps of a start of the sandbox. */
    starting: startingLogSchema,
    /** The person signed in, who reads the transcript. */
    viewer: { enum: personKeys },
    /** How the folds of the ended turns show. */
    fold: { enum: foldStates },
    /** The viewport of the screen, when it differs from the view. */
    viewport: { enum: viewports },
    /** The reads of the pictures of the answers, while the computer runs. */
    pictures: { enum: pictureReads },
    /** The reader reads higher up, so the button to the bottom shows. */
    scrolledUp: { type: 'boolean' },
    /**
     * The card on top of the request stack, and in a walk the page of each
     * card and of each answer that keeps the example.
     */
    stack: {
      type: 'object',
      additionalProperties: false,
      properties: {
        place: { type: 'integer', minimum: 1 },
        pages: { type: 'array', items: { type: 'string', minLength: 1 } },
        answers: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['request'],
            properties: {
              request: { type: 'string', minLength: 1 },
              allow: { type: 'string', minLength: 1 },
              deny: { type: 'string', minLength: 1 },
              value: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
  },
} as const

type Props = Omit<SchemaProps<typeof propSchema>, 'items'> & {
  items: readonly ChatItem[]
}

const slots = ['empty', 'notice', 'capabilitiesPanel', 'pickerPart'] as const

/**
 * The chat transcript with its composer, registered with Mokly. A screen
 * supplies the content of an empty chat, the notice above the composer,
 * and the open Capabilities control of the composer in slots. A screen
 * that draws a screen of another viewport passes `viewport`. Without it, a
 * page of the part draws the layout of its own view.
 */
export const chatPane = defineComponent<typeof propSchema, typeof slots, Props>(
  {
    slug: 'chat-pane',
    title: 'Chat pane',
    description:
      'The chat transcript, with the composer or a sandbox bar under it. When a turn ends, the work before each of its answers folds into one line. While the sandbox starts, its steps show at the end of the transcript. Open Mac commands and secret requests, including late requests, stay in a stack above the composer. They return to the transcript after an answer or when they end. An empty chat shows the content that the screen supplies. Its own page shows the finished turn of Checkout address autocomplete.',
    relatedDocs: ['docs/mockups/design-chat.md'],
    propSchema,
    slots,
    props: { items: plainData(conversations.history), composer, viewer: 'cal' },
    render: (props, context) => (
      <ChatPane
        composer={withComposerPanel(
          props.composer,
          props.capabilitiesPanel,
          props.pickerPart,
        )}
        empty={props.empty}
        fold={props.fold}
        items={props.items}
        notice={props.notice}
        pictures={props.pictures}
        problem={props.problem}
        scrolledUp={props.scrolledUp}
        stack={props.stack}
        starting={props.starting}
        viewer={props.viewer}
        viewport={props.viewport ?? context.viewport}
      />
    ),
    variants: [
      {
        slug: 'running',
        title: 'Turn running',
        description:
          'A turn runs: the newest run of tool calls is open, and Stop shows in the composer.',
        props: {
          items: plainData(conversations.running),
          composer: { ...composer, running: true },
        },
      },
      {
        slug: 'scrolled-up',
        title: 'Read higher up',
        description:
          'The reader reads an earlier part of the chat: a round button above the right end of the composer shows the bottom of the chat.',
        props: { scrolledUp: true },
      },
      {
        slug: 'empty',
        title: 'Empty',
        description:
          'A new session without messages shows the content of the screen.',
        props: { items: [] },
        slots: { empty: 'The content of an empty chat, from the screen.' },
      },
      {
        slug: 'starting',
        title: 'Sandbox starting',
        description:
          'The steps of the start of the sandbox end the transcript.',
        props: { items: [], starting: creatingLog },
      },
      {
        slug: 'stopped',
        title: 'Sandbox stopped',
        description:
          'The bar of a stopped sandbox takes the place of the composer.',
        props: { problem: { problem: 'stopped' } },
      },
    ],
  },
)

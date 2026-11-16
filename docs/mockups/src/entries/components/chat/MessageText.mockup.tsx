import { defineComponent } from '@mokly/mokly'
import {
  LinkChip,
  LinkText,
  MessageText,
} from '../../../components/chat/MessageText'
import { plainData } from '../../../defined'
import {
  attachmentMessage,
  draftAttachments,
} from '../../../fixtures/attachments'
import { mentionChipsDraft } from '../../../fixtures/fileMentions'
import { followUpTask } from '../../../fixtures/workspaceLinkConversations'
import { checkoutAutocomplete, savedCarts } from '../../../fixtures/workspaces'
import { paths } from '../../../paths'
import { workspaceRowSchema } from '../workspaces/workspaceSchemas'
import { attachmentSchema } from './chatBlockSchemas'
import { chipToSchema, openerTo } from './chipOpener'

/** A session of a linked workspace that the chat read, as `ChatSession`. */
const chatSessionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'closed'],
  properties: {
    id: { type: 'string', minLength: 1 },
    /** The title of the session, or null before it has one. */
    title: { type: ['string', 'null'] },
    closed: { type: 'boolean' },
    to: { type: 'string', minLength: 1 },
  },
} as const

/** The row of Saved carts in the list of Acme. */
const savedCartsRow = plainData({
  workspace: savedCarts,
  status: 'ready',
  github: savedCarts.github,
  selected: false,
} as const)

/**
 * The chip of a link to a workspace of the org, registered with Mokly. Its
 * adapter builds a link to the screen `to`, because a callback is not
 * data.
 */
export const linkChip = defineComponent({
  slug: 'link-chip',
  title: 'Link chip',
  description:
    'The chip of a link to a workspace of the org: a session chip when the chat read the session that the link names, or the chip of the workspace. In a sent message or an answer it opens its page. In a message box it has the cell of its mark. Its own page shows the chip of Saved carts.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['target'],
    properties: {
      /** The workspace that the link names, and its session, if any. */
      target: {
        type: 'object',
        additionalProperties: false,
        required: ['row'],
        properties: { row: workspaceRowSchema, session: chatSessionSchema },
      },
      to: chipToSchema,
      /** The chip of a message box, with the pointer over its mark or not. */
      pointer: { type: 'boolean' },
    },
  } as const,
  props: { target: { row: savedCartsRow } },
  render: (props) => (
    <LinkChip
      opener={openerTo(props.to)}
      pointer={props.pointer}
      target={props.target}
    />
  ),
  variants: [
    {
      slug: 'session',
      title: 'Session',
      description: 'A link to a session that the chat read, as a link to it.',
      props: {
        target: {
          row: savedCartsRow,
          session: {
            id: 'restore-carts',
            title: 'Restore saved carts after sign-in',
            closed: false,
          },
        },
        to: paths.firstTurn,
      },
    },
    {
      slug: 'message-box',
      title: 'In a message box',
      description: 'The chip in a message box, with the cell of its mark.',
      props: { pointer: false },
    },
  ],
})

/**
 * The link of a session, as the line of a stop from a session shows it,
 * registered with Mokly. A link that the chat does not find stays text.
 */
export const linkText = defineComponent({
  slug: 'link-text',
  title: 'Link text',
  description:
    'The link of a session, as the line of a stop from a session shows it: the chip of the session, or of its workspace while the chat did not read the session. A link that the chat does not find stays text. Its own page shows the chip of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['href'],
    properties: {
      href: { type: 'string', minLength: 1 },
      /** The link as the text has it, which shows when the chat finds none. */
      source: { type: 'string' },
    },
  } as const,
  props: { href: checkoutAutocomplete.link },
  render: (props) => <LinkText href={props.href} source={props.source} />,
  variants: [
    {
      slug: 'not-found',
      title: 'Not found',
      description: 'A link that names no workspace of the org stays text.',
      props: { href: 'https://example.com/elsewhere' },
    },
  ],
})

/**
 * The text of a sent message or an answer, registered with Mokly. Its
 * pages show each kind of chip and link that a text holds. The parts of a
 * text have no key that stays the same, so the text draws them with the
 * plain parts.
 */
export const messageText = defineComponent({
  slug: 'message-text',
  title: 'Message text',
  description:
    'The text of a sent message or an answer. Each part in backticks is code, and each link to a workspace of the org is a chip that opens the workspace. Each other web address is a link. An answer shows `**` as bold and a Markdown link as its label. In the text of a member, each mention of a file or a folder is a chip, and the mention of an attached file shows the chip of that file. Its own page shows a message that links a workspace.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: {
      text: { type: 'string' },
      /** The text of a member: each mention of a file is a chip. */
      mentions: { type: 'boolean' },
      /** An answer: `**` marks bold, and a Markdown link shows its label. */
      strong: { type: 'boolean' },
      /** The attached files of a sent message. */
      files: { type: 'array', items: attachmentSchema },
      /** The message waits for the cloud computer. */
      waits: { type: 'boolean' },
    },
  } as const,
  props: { text: followUpTask },
  render: (props) => (
    <MessageText
      files={props.files}
      mentions={props.mentions}
      strong={props.strong}
      text={props.text}
      waits={props.waits}
    />
  ),
  variants: [
    {
      slug: 'answer',
      title: 'Answer',
      description:
        'An answer of the agent with bold, code, and a Markdown link to the docs.',
      props: {
        strong: true,
        text: 'The proxy calls the **[autocomplete endpoint](https://docs.places.example/v1/autocomplete)** of the places API, from `src/app/api/places/route.ts`.',
      },
    },
    {
      slug: 'mentions',
      title: 'Mentions',
      description: 'A message of a member with a file chip and a folder chip.',
      props: { mentions: true, text: mentionChipsDraft },
    },
    {
      slug: 'files',
      title: 'Attached files',
      description:
        'A message whose attached files stand at their places in the text.',
      props: {
        mentions: true,
        files: draftAttachments,
        text: attachmentMessage,
      },
    },
  ],
})

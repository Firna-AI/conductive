import { defineComponent } from '@mokly/mokly'
import { LinkChip, LinkText } from '../../../components/chat/LinkChip'
import { MessageText, useSentParts } from '../../../components/chat/MessageText'
import { plainData } from '../../../defined'
import {
  attachmentMessage,
  draftAttachments,
  type Attachment,
} from '../../../fixtures/attachments'
import { mentionChipsDraft } from '../../../fixtures/fileMentions'
import { skillChipDraft } from '../../../fixtures/skills'
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

function RegisteredMessageText(props: {
  text: string
  files?: readonly Attachment[]
  mentions?: boolean
  waits?: boolean
  pointer?: boolean
}) {
  const files = props.files ?? []
  const parts = useSentParts(props.text, files, props.mentions === true)
  return (
    <MessageText
      files={files}
      parts={parts}
      pointer={props.pointer}
      waits={props.waits}
    />
  )
}

/**
 * The text of a message of a member, registered with Mokly. Its pages show
 * each kind of chip and link that a text holds. The parts of a
 * text have no key that stays the same, so the text draws them with the
 * plain parts.
 */
export const messageText = defineComponent({
  slug: 'message-text',
  title: 'Message text',
  description:
    'The text of a message of a member, as typed. Each part in backticks is code, and each link to a workspace of the org is a chip that opens the workspace. Each other web address is a link, and a Markdown link shows as typed. Each mention of a file or a folder is a chip, each skill of the list is a skill chip that opens the skill tab, and the mention of an attached file shows the chip of that file. The text of an answer is not this part. Its own page shows a message that links a workspace.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: {
      text: { type: 'string' },
      /** Each mention of a file and each skill is a chip. */
      mentions: { type: 'boolean' },
      /** The attached files of a sent message. */
      files: { type: 'array', items: attachmentSchema },
      /** The message waits for the cloud computer. */
      waits: { type: 'boolean' },
      /** The pointer over the first skill chip, as a view cannot hover. */
      pointer: { type: 'boolean' },
    },
  } as const,
  props: { text: followUpTask },
  render: (props) => <RegisteredMessageText {...props} />,
  variants: [
    {
      slug: 'skill',
      title: 'Skill chip',
      description:
        'A message of a member that starts with the chip of a skill, which opens the skill tab.',
      props: { mentions: true, text: skillChipDraft },
    },
    {
      slug: 'skill-pointer',
      title: 'Skill chip under the pointer',
      description:
        'The pointer is over the skill chip, which takes the fill of a hover, as each chip that opens a page does.',
      props: { mentions: true, text: skillChipDraft, pointer: true },
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

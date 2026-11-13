import {
  attachmentMessage,
  draftAttachments,
  firstMessageAttachments,
  firstMessageWithFiles,
  listedMessage,
  transferredAttachments,
  type Attachment,
} from './attachments'
import type { ChatItem } from './conversations'

/** The first answer of the agent to the message with the screenshot. */
const filesAnswer: readonly ChatItem[] = [
  {
    kind: 'agent',
    id: 'files-plan',
    blocks: [
      "The screenshot shows the suggestions over the postcode field, and the log has no errors. So I'll fix the layout of the form.",
    ],
  },
  {
    kind: 'tool',
    id: 'read-styles',
    tool: 'read',
    target: 'src/app/checkout/AddressForm.module.css',
    status: 'done',
  },
  { kind: 'working', id: 'working', elapsed: '21s' },
]

/**
 * The cause of a turn whose message names attached files that are no longer
 * in the cloud computer. It names each such file in the order of the
 * message, and asks the member to attach it again in a new message.
 */
function missingCause(files: readonly Attachment[]): string {
  const names = new Intl.ListFormat('en').format(files.map((file) => file.name))
  return files.length === 1
    ? `${names} is no longer in the cloud computer. Attach it again in a new message.`
    : `${names} are no longer in the cloud computer. Attach them again in a new message.`
}

/**
 * The chat after a Try again of the message with the screenshot and the
 * log. The first try got both files into the cloud computer and then
 * failed. The app then deleted its stored copies, and `missing` left the
 * cloud computer. So the Try again stopped before any work. Try again
 * sends the same text with the same files, so the chat shows the message
 * twice, and only the newest failure offers Try again.
 */
function missingTries(
  history: readonly ChatItem[],
  missing: readonly Attachment[],
): readonly ChatItem[] {
  const message = {
    kind: 'user',
    text: attachmentMessage,
    attachments: transferredAttachments,
  } as const
  return [
    ...history,
    { ...message, id: 'ask-files' },
    {
      kind: 'error',
      id: 'overloaded',
      text: 'Claude is overloaded right now.',
      older: true,
    },
    { ...message, id: 'ask-files-again' },
    { kind: 'error', id: 'missing', text: missingCause(missing) },
  ]
}

/**
 * The chats of messages with files. A sent message holds `@` and the copy
 * path of each file at its place, and shows the chip of the file there. A
 * file that the text does not show stays under the message. The app copies
 * the files into the cloud computer when the turn of the message starts.
 * So the first message of a new workspace keeps its files while its cloud
 * computer starts. Then the app deletes its stored copies, so a Try again
 * fails when a file is no longer in the cloud computer.
 */
export function attachmentConversations(history: readonly ChatItem[]) {
  return {
    'sent-files': [
      ...history,
      {
        kind: 'user',
        id: 'ask-files',
        text: attachmentMessage,
        attachments: draftAttachments,
      },
      ...filesAnswer,
    ],
    'sent-files-listed': [
      ...history,
      {
        kind: 'user',
        id: 'ask-files',
        text: listedMessage,
        attachments: draftAttachments,
      },
      ...filesAnswer,
    ],
    'queued-files': [
      {
        kind: 'user',
        id: 'ask',
        text: firstMessageWithFiles,
        attachments: firstMessageAttachments,
        queued: true,
      },
    ],
    'missing-file': missingTries(history, transferredAttachments.slice(0, 1)),
    'missing-files': missingTries(history, transferredAttachments),
  } as const satisfies Record<string, readonly ChatItem[]>
}

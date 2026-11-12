import {
  attachmentMessage,
  draftAttachments,
  firstMessageAttachments,
  firstMessageWithFiles,
  listedMessage,
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
 * The chats of messages with files. A sent message holds `@` and the copy
 * path of each file at its place, and shows the chip of the file there. A
 * file that the text does not show stays under the message. The app copies
 * the files into the cloud computer when the turn of the message starts.
 * So the first message of a new workspace keeps its files while its cloud
 * computer starts.
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
  } as const satisfies Record<string, readonly ChatItem[]>
}

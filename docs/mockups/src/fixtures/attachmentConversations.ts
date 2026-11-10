import {
  attachmentDraft,
  draftAttachments,
  firstMessageAttachments,
} from './attachments'
import type { ChatItem } from './conversations'

/**
 * The chats of messages with files, which show under each message. The app
 * copies the files into the cloud computer when the turn of the message
 * starts. So the first message of a new workspace keeps its files while its
 * cloud computer starts.
 */
export function attachmentConversations(chats: {
  /** The finished turn of the canonical chat. */
  history: readonly ChatItem[]
  /** The first message of the new workspace. */
  firstMessage: string
}) {
  return {
    'sent-files': [
      ...chats.history,
      {
        kind: 'user',
        id: 'ask-files',
        text: attachmentDraft,
        attachments: draftAttachments,
      },
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
    ],
    'queued-files': [
      {
        kind: 'user',
        id: 'ask',
        text: chats.firstMessage,
        attachments: firstMessageAttachments,
        queued: true,
      },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}

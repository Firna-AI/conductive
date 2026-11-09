/**
 * Files that the user attaches to a message. The app uploads each one to the
 * sandbox, and an image also goes to the model as an image.
 */

export type Attachment = {
  name: string
  kind: 'image' | 'file'
  sizeBytes: number
}

export const draftAttachments: readonly Attachment[] = [
  { name: 'postcode-overlap.png', kind: 'image', sizeBytes: 290_816 },
  { name: 'checkout-console.log', kind: 'file', sizeBytes: 12_288 },
]

/** The file that the user attaches to the first message of a new workspace. */
export const newWorkspaceAttachments: readonly Attachment[] = [
  { name: 'saved-cart-flow.png', kind: 'image', sizeBytes: 348_160 },
]

/** The message that the user writes about the attached files. */
export const attachmentDraft =
  'On small screens the suggestions cover the postcode field. The screenshot and the console log show it.'

/**
 * Files that the user attaches to a message. The app stores each upload
 * until the turn of its message starts, then copies it into the cloud
 * computer. An image also goes to the model as an image.
 */

export type Attachment = {
  name: string
  kind: 'image' | 'file'
  sizeBytes: number
  /**
   * The upload of a file in the composer: it still runs, or it failed. A
   * file without a state is uploaded, and a sent message holds only such
   * files.
   */
  state?: 'uploading' | 'failed'
  /**
   * The bytes of an upload that the browser measured as sent. A file whose
   * upload has no measurement yet, such as one that waits for its turn,
   * has none.
   */
  sentBytes?: number
}

const screenshot: Attachment = {
  name: 'postcode-overlap.png',
  kind: 'image',
  sizeBytes: 290_816,
}

const consoleLog: Attachment = {
  name: 'checkout-console.log',
  kind: 'file',
  sizeBytes: 12_288,
}

export const draftAttachments: readonly Attachment[] = [screenshot, consoleLog]

/**
 * The screenshot uploads, and the browser measured 64% of it as sent. The
 * log waits for its turn, so it has no measurement yet.
 */
export const uploadingAttachments: readonly Attachment[] = [
  { ...screenshot, state: 'uploading', sentBytes: 186_123 },
  { ...consoleLog, state: 'uploading' },
]

/** The upload of the screenshot failed, and the log is uploaded. */
export const failedAttachments: readonly Attachment[] = [
  { ...screenshot, state: 'failed' },
  consoleLog,
]

/** A screen recording over the size limit, which the app does not attach. */
export const largeRecording: Attachment = {
  name: 'checkout-recording.mov',
  kind: 'file',
  sizeBytes: 49_912_218,
}

const sketch: Attachment = {
  name: 'saved-cart-sketch.png',
  kind: 'image',
  sizeBytes: 1_468_006,
}

const notes: Attachment = {
  name: 'cart-restore-notes.md',
  kind: 'file',
  sizeBytes: 3_174,
}

/** The files of the first message of the new workspace. */
export const firstMessageAttachments: readonly Attachment[] = [sketch, notes]

/**
 * The files of the first message in each state of the New workspace page:
 * none, the sketch at 35% with the notes that wait for their turn, or both
 * uploaded. No workspace and no cloud computer exist yet.
 */
export const firstMessageDrafts = {
  none: [],
  uploading: [
    { ...sketch, state: 'uploading', sentBytes: 513_803 },
    { ...notes, state: 'uploading' },
  ],
  ready: firstMessageAttachments,
} as const satisfies Record<string, readonly Attachment[]>

/** The message that the user writes about the attached files. */
export const attachmentDraft =
  'On small screens the suggestions cover the postcode field. The screenshot and the console log show it.'

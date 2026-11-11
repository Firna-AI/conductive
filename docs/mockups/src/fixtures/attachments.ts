import { fileMark } from '../components/chat/draftMarks'

/**
 * Files that the user attaches to a message. The app stores each upload
 * until the turn of its message starts, then copies it into the cloud
 * computer. An image also goes to the model as an image. Each file is a
 * chip at its place in the text, and the draft text holds its mark there.
 */

export type Attachment = {
  /** The draft ID of the file, which its mark in the draft text holds. */
  id: string
  name: string
  kind: 'image' | 'file'
  sizeBytes: number
  /**
   * The copy path that the upload gives: `.context/attachments/`, a digest
   * of the file ID only, and the safe name. A sent message holds `@` and
   * this path at the place of the file.
   */
  path: string
  /** The file tab that a press on its sent chip shows, when drawn. */
  tab?: 'picture'
  /**
   * The upload of a file in the composer: it still runs, or it failed. A
   * file without a state is uploaded, and a sent message holds only such
   * files.
   */
  state?: 'uploading' | 'failed'
  /**
   * The bytes of an upload that the browser measured as sent. A file whose
   * upload has no measurement yet, such as one just dropped, has none.
   */
  sentBytes?: number
}

const screenshot: Attachment = {
  id: 'screenshot',
  name: 'postcode-overlap.png',
  kind: 'image',
  sizeBytes: 290_816,
  path: '.context/attachments/5f0c2b7e9a14d3c86b0e4f21a7d95c3e/postcode-overlap.png',
  tab: 'picture',
}

const consoleLog: Attachment = {
  id: 'console-log',
  name: 'checkout-console.log',
  kind: 'file',
  sizeBytes: 12_288,
  path: '.context/attachments/b81e4a6c03f7d29e5c1a8b4f6d2e07a9/checkout-console.log',
}

/** The copy of the screenshot, which a press on its sent chip opens. */
export const screenshotCopy = screenshot

export const draftAttachments: readonly Attachment[] = [screenshot, consoleLog]

/**
 * The screenshot uploads, and the browser measured 64% of it as sent. The
 * log is uploaded.
 */
export const uploadingAttachments: readonly Attachment[] = [
  { ...screenshot, state: 'uploading', sentBytes: 186_123 },
  consoleLog,
]

/** Just after the drop: the upload of the screenshot has no measurement. */
export const droppedAttachments: readonly Attachment[] = [
  { ...screenshot, state: 'uploading' },
  consoleLog,
]

/** Before the drop, the draft holds only the log. */
export const beforeDropAttachments: readonly Attachment[] = [consoleLog]

/** The upload of the screenshot failed, and the log is uploaded. */
export const failedAttachments: readonly Attachment[] = [
  { ...screenshot, state: 'failed' },
  consoleLog,
]

/** A screen recording over the size limit, which the app does not attach. */
export const largeRecording = {
  name: 'checkout-recording.mov',
  sizeBytes: 49_912_218,
} as const

/** A folder of screenshots that a drop holds, which the app does not attach. */
export const droppedFolder = 'checkout-screens'

/** The words of the message around the places of the screenshot and the log. */
const overlapWords = {
  start:
    'On small screens the suggestions cover the postcode field. The screenshot ',
  middle: 'shows the overlap, and the console log ',
  end: ' has no errors.',
} as const

function overlapText(shot: string, log: string): string {
  return `${overlapWords.start}${shot}${overlapWords.middle}${log}${overlapWords.end}`
}

/**
 * The message that the user writes about the attached files, with the mark
 * of each file at its place. A space stands on each side of a mark, as
 * around a mention.
 */
export const attachmentDraft = overlapText(
  `${fileMark(screenshot.id)} `,
  fileMark(consoleLog.id),
)

/** The sent message: `@` and the copy path of each file at its place. */
export const attachmentMessage = overlapText(
  `@${screenshot.path} `,
  `@${consoleLog.path}`,
)

/**
 * The draft before the drop of the screenshot. The drop caret stands after
 * "The screenshot ", where the pointer is.
 */
export const beforeDrop = {
  draft: overlapText('', fileMark(consoleLog.id)),
  caret: overlapWords.start.length,
} as const

/** After the drop, the caret stands after the new chip and its space. */
export const afterDropCaret =
  overlapWords.start.length + fileMark(screenshot.id).length + 1

/**
 * A message from before the files had a place in its text. Its text holds
 * no mention of its files, so they show under it.
 */
export const listedMessage =
  'On small screens the suggestions cover the postcode field. The screenshot and the console log show it.'

const sketch: Attachment = {
  id: 'sketch',
  name: 'saved-cart-sketch.png',
  kind: 'image',
  sizeBytes: 1_468_006,
  path: '.context/attachments/2d9a7f3c6e1b48a05f8c3d7e9b2a14c6/saved-cart-sketch.png',
}

const notes: Attachment = {
  id: 'notes',
  name: 'cart-restore-notes.md',
  kind: 'file',
  sizeBytes: 3_174,
  path: '.context/attachments/e47b1c9d5a3f60b28e4d7c1a9f5b3e08/cart-restore-notes.md',
}

/** The words of the first message around the places of its two files. */
const firstWords = {
  start:
    'Let signed-in shoppers save their cart and restore it on another device, as the sketch ',
  middle:
    'shows. Store carts in the existing Postgres database, and add tests. The notes ',
  end: ' list the cases to cover.',
} as const

function firstMessageText(sketchPart: string, notesPart: string): string {
  return `${firstWords.start}${sketchPart}${firstWords.middle}${notesPart}${firstWords.end}`
}

/** The files of the first message of the new workspace. */
export const firstMessageAttachments: readonly Attachment[] = [sketch, notes]

/** The first message with the mark of each file at its place. */
export const firstMessageDraft = firstMessageText(
  `${fileMark(sketch.id)} `,
  fileMark(notes.id),
)

/** The first message as it waits: `@` and the copy path of each file. */
export const firstMessageWithFiles = firstMessageText(
  `@${sketch.path} `,
  `@${notes.path}`,
)

/**
 * The first message before the drop of the sketch: the notes have their
 * place, and the drop caret stands after "as the sketch ", where the
 * pointer is.
 */
export const firstMessageBeforeDrop = {
  draft: firstMessageText('', fileMark(notes.id)),
  caret: firstWords.start.length,
} as const

/**
 * The files of the first message in each state of the New workspace page:
 * none, the sketch at 35% with the notes that wait for their turn, both
 * uploaded, or the notes while the sketch hovers over the box before its
 * drop. No workspace and no cloud computer exist yet.
 */
export const firstMessageDrafts = {
  none: [],
  uploading: [
    { ...sketch, state: 'uploading', sentBytes: 513_803 },
    { ...notes, state: 'uploading' },
  ],
  ready: firstMessageAttachments,
  'drop-over': [notes],
} as const satisfies Record<string, readonly Attachment[]>

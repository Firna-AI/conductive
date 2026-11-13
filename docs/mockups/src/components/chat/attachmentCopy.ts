/**
 * The words of the attached files: the state of an upload in the composer,
 * and the notices for a file over the size limit and for a dropped folder
 * that the browser cannot read.
 * The app stores each file until the turn of its message starts, so an
 * upload needs no cloud computer, also in a new workspace.
 */

/** The words that screen readers hear before the name of an attached file. */
export const attachedFileWords = 'Attached file'

/**
 * The label of a file whose upload runs, in place of its size, until the
 * browser measures the bytes that it sent.
 */
export const uploadingLabel = 'Uploading'

/**
 * The label of an upload with a measurement: the share of the file that the
 * browser sent, such as "64%". It shows 100% only when every byte went.
 * `sizeBytes` is more than zero.
 */
export function sentLabel(sentBytes: number, sizeBytes: number): string {
  return `${Math.floor((sentBytes / sizeBytes) * 100)}%`
}

/** The label of a file whose upload failed, in place of its size. */
export const failedLabel = 'Failed'

/** The action of a failed upload, which uploads the same file again. */
export const tryAgainLabel = 'Try again'

/** The title of the notice for a file that the composer did not attach. */
export function notAttachedTitle(name: string): string {
  return `${name} wasn't attached`
}

/** The title of that notice for two or more files of one pick. */
export function notAttachedCountTitle(count: number): string {
  return `${count} files weren't attached`
}

/**
 * The body of that notice: the size limit of each file. It gives no size of
 * the chosen file, because the size formatter counts in units of 1024 and
 * the limit counts in units of 1000. So the two numbers could disagree.
 */
export const tooLargeBody = 'Each file can be up to 25 MB.'

/** The action of that notice, which opens the file picker again. */
export const smallerFileLabel = 'Attach a smaller file'

/**
 * The body of the notice for a dropped folder that the browser cannot read,
 * so the composer cannot zip it. The title names the folder, as for a file
 * over the size limit.
 */
export const folderBody =
  "The folder couldn't be read. Attach the files in it instead."

/** The action of that notice, which opens the file picker. */
export const attachFilesLabel = 'Attach files'

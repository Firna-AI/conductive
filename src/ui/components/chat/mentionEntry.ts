/**
 * A file or a folder of the branch, as the kept file tree has it: its path
 * inside the repository. The list of `@` and the chips read these entries.
 */
export type MentionEntry = {
  path: string
  folder: boolean
  /** The tab that a press on the chip of this file shows, when drawn. */
  preview?: 'code' | 'markdown' | 'screenshot'
}

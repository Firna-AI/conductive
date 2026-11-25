import { listStates } from '../fixtures/limitedFiles'

/**
 * The part of the workspace state that limits the file lists, as the
 * runner limits the reports of a large branch. `workspaceState.ts` adds it
 * to the state of the screen as an optional property.
 */
export const listsStateProperties = {
  /**
   * The lists of All files and Changes: limited, or complete, as without
   * this property. The limited lists belong to a branch with 68,412 files
   * and folders that changes 2,243 files. All files keeps 50,000 entries and
   * Changes keeps 1,000 files. Each list shows a notice of what it leaves
   * out, and the summary and the tab of Changes count the whole change.
   * `tree` and `lostUpdate` add the notices of a list that is not the
   * latest one beside them. The property is optional, because the parts
   * that take the whole state, such as `FilesContent`, then keep the props
   * of every earlier state, so Mokly's Changes lists no earlier screen.
   */
  lists: { enum: listStates },
} as const

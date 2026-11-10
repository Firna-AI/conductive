/**
 * Archive deletes the cloud computer of a workspace
 * and keeps its chat read-only in the Archived group. It checks first for
 * work that is not committed or not pushed.
 */

/** The day the open workspace was archived. */
export const archivedOn = '5 November'

/** Work that is not on GitHub yet, which the check of Archive finds. */
export type UnpushedWork = {
  /** Changed files that are not committed. */
  files: readonly string[]
  /** Commits held by no remote branch, across all local branches. */
  commits: number
}

/** The work that is not on GitHub yet, in the cloud computer to delete. */
export const unpushedWork = {
  /** Changed files that are not committed. */
  files: ['src/app/checkout/AddressForm.tsx', 'tests/checkout/address.test.ts'],
  /** Commits held by no remote branch, across all local branches. */
  commits: 1,
} as const

/**
 * Archive stops the cloud computer of a workspace at once, with no check
 * and no question, and keeps its chat read-only in the Archived group.
 * Restore brings the workspace back with its files and sessions until the
 * app deletes the cloud computer, 14 days after the Archive.
 */

/** The day the open workspace was archived. */
export const archivedOn = '5 November'

/**
 * The last day of Restore. The app deletes the cloud computer then, and a
 * delete that fails tries again after it, while Restore stays ended.
 */
export const restoreUntil = '19 November'

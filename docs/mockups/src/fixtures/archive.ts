/**
 * Archive stops the cloud computer of a workspace at once, with no check
 * and no question, and keeps its chat read-only in the Archived group.
 * Restore brings the workspace back with its files and sessions until the
 * app deletes the cloud computer, 14 days after the Archive. On that day the
 * workspace also leaves the list. The app keeps its chat, so a link still
 * opens it, read-only.
 */

/** The days that the bar and the toast of an archived workspace give. */
export type ArchiveDays = {
  /** The day of the Archive. */
  archivedOn: string
  /**
   * The day 14 days after the Archive: the last day of Restore, and the
   * day when the workspace leaves the list. The app deletes the cloud
   * computer then, and a delete that fails tries again after it, while
   * Restore stays ended.
   */
  removedOn: string
}

/** The days of a workspace that Cal archives now, on 5 November. */
export const archivedNow: ArchiveDays = {
  archivedOn: '5 November',
  removedOn: '19 November',
}

/**
 * The days of Postcode lookup for the shipping and billing forms, which
 * left the list before the other screens of the catalogue.
 */
export const postcodeArchive: ArchiveDays = {
  archivedOn: '15 October',
  removedOn: '29 October',
}

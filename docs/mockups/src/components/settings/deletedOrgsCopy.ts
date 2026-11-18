/**
 * The words of the Deleted orgs section of the Account page. The page of
 * the app and its mockup share them.
 */
export const deletedOrgsCopy = {
  title: 'Deleted orgs',
  description:
    'Restore an org to bring back its workspaces, chats, and settings. Only admins see a deleted org.',
  list: 'Deleted orgs',
  /** When everything of the org is deleted, under its name. */
  deletes: (day: string) => `Everything is deleted on ${day}`,
  /** A suspended org refuses a restore, so its row says why it has none. */
  suspended: (day: string) =>
    `Suspended, so it can't be restored. Everything is deleted on ${day}`,
  /** The button, short so that the row fits a phone. */
  restore: 'Restore',
  /** The name of the button for a screen reader. */
  restoreLabel: (name: string) => `Restore ${name}`,
  failed: (name: string) => `${name} was not restored`,
}

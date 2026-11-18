/**
 * The parts of the workspace state that draw the menu of a row of the Files
 * panel, from the file row menu change, and the toast after Copy path.
 * `workspaceState.ts` adds them to the state of the screen.
 */
export const rowMenuStateProperties = {
  /**
   * The row whose menu is open, in the list of `files`: none, the file
   * AddressForm.tsx in All files or in Changes, the folder
   * src/app/checkout of All files, or postcodeLookup.ts, which Changes
   * lists as deleted. A right click opens the menu at the pointer on
   * desktop. A phone shows it as a sheet over its Files tab.
   */
  rowMenu: { enum: ['none', 'file', 'folder', 'deleted'] },
  /**
   * The toast after Copy path in a row menu or a tab menu: none, after a
   * copy that worked, or after a clipboard write that failed. The menu
   * closed on the press.
   */
  copyPath: { enum: ['none', 'copied', 'failed'] },
} as const

export const rowMenuStateKeys = ['rowMenu', 'copyPath'] as const

/** No row menu, and no copy just pressed. */
export const rowMenuStateDefaults = {
  rowMenu: 'none',
  copyPath: 'none',
} as const

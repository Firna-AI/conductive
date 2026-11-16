/**
 * The part of the workspace state that draws the find bar of the shown tab
 * (find decision 1 B). `workspaceState.ts` adds it to the state of the
 * screen.
 */
export const findStateProperties = {
  /**
   * The find bar of the shown tab: closed, open with a query and its
   * matches, just opened with an empty field, or with a query that matches
   * no text. While it is open, its field has the focus, so a phone shows
   * the on-screen keyboard. A tab without text, such as a picture or a new
   * session, offers no Find, so its bar stays closed.
   */
  find: { enum: ['closed', 'found', 'empty', 'no-match'] },
} as const

export const findStateKeys = ['find'] as const

/** The find bar is closed. */
export const findStateDefaults = { find: 'closed' } as const

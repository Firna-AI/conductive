/**
 * The parts of the workspace state that give the short feedback after an
 * action: the toast after Archive, the copy of the workspace link, and the
 * copy of a session transcript. `workspaceState.ts` adds them to the state
 * of the screen.
 */
export const feedbackStateProperties = {
  /**
   * A toast at the bottom of the screen: none, or the toast just after
   * Archive, which names the workspace and offers Restore.
   */
  toast: { enum: ['none', 'archived'] },
  /**
   * The label of the workspace number in the header, which copies the
   * link of the workspace: as it is, or just after a press, while it
   * shows for a moment that the copy worked or failed.
   */
  copyLink: { enum: ['none', 'copied', 'failed'] },
  /**
   * The toast after a copy of a session transcript from the tab menu: none,
   * after a copy that worked, or after a request or a clipboard write that
   * failed. The menu closed on the press, and the shown tab stays.
   */
  copyTranscript: { enum: ['none', 'copied', 'failed'] },
} as const

export const feedbackStateKeys = [
  'toast',
  'copyLink',
  'copyTranscript',
] as const

/** No toast, and no copy just pressed. */
export const feedbackStateDefaults = {
  toast: 'none',
  copyLink: 'none',
  copyTranscript: 'none',
} as const

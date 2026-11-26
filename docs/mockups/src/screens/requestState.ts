/** The workspace states for the request stack and the session tab marks. */
export const requestStateProperties = {
  /**
   * An open request of a session that does not show: none, or the late
   * request for PROD_DATABASE_URL of the first session, Address
   * autocomplete. Its tab then shows the needs-input mark, and the
   * workspace needs input (needs-input decision 2 B).
   */
  otherRequest: { enum: ['none', 'first-session'] },
  /**
   * The place of the card on top of the stack of requests above the
   * composer, from 1, in the order of the stack. Previous and Next of the
   * stack move it. A place past the end shows the last card.
   */
  shownRequest: { type: 'integer', minimum: 1, maximum: 4 },
} as const

export const requestStateKeys = ['otherRequest', 'shownRequest'] as const

export const requestStateDefaults = {
  otherRequest: 'none',
  shownRequest: 1,
} as const

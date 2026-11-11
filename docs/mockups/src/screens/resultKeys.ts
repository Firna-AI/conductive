/**
 * A session from Conductor after the activation of its workspace, which the
 * `session` tab shows, or which opened the Markdown of its old session on
 * the `old-session` tab: none, Apply coupons before tax, which resumed with
 * the agent's memory, or Coupon edge cases in tests, which could not resume
 * and started fresh from its old chat. A workspace that did not come from
 * Conductor has none.
 */
export const resumeKeys = ['none', 'memory', 'fallback'] as const

/**
 * The result of a copy that the screen shows for a moment: none, a copy
 * that worked, or a copy that failed. The label of the workspace number in
 * the header copies the link of the workspace. Copy transcript of the tab
 * menu copies a session transcript, after a request and a clipboard write.
 */
export const copyResults = ['none', 'copied', 'failed'] as const

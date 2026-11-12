/**
 * A request that the message field of the chat of a workspace takes the
 * focus when it shows, as after a click on the workspace in the sidebar.
 * The field shows only after the chat loads, so the request waits for it.
 */
export interface ComposerFocusRequest {
  readonly workspaceId: string
  /**
   * The element that had the focus at the request, such as the link of the
   * row. A focus that moved to another element since then cancels the
   * request, so the field never takes the focus from a later choice.
   */
  readonly from: Element | null
}

/**
 * Whether the field can take the focus for `request` now: the focus is
 * still on the element of the request, or on no element.
 */
export function focusStayed(request: ComposerFocusRequest): boolean {
  const page = request.from?.ownerDocument ?? document
  const active = page.activeElement
  return active === null || active === page.body || active === request.from
}

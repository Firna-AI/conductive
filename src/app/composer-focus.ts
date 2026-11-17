/**
 * A request that the message field of the chat of a workspace takes the
 * focus when it shows, as after a click on the workspace in the sidebar, or
 * after Add to chat in the menu of a row of the Files panel on desktop. The
 * field shows only after the chat loads, so the request waits for it.
 */
export interface ComposerFocusRequest {
  readonly workspaceId: string
  /**
   * The element that had the focus at the request, such as the link of the
   * row of the sidebar, or the row of the Files panel whose menu ran Add to
   * chat. A focus that moved to another element since then cancels the
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

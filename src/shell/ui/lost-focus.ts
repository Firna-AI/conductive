import { useEffect, type RefObject } from 'react'

/** The focus fell to the page, as when its element left the page. */
export function focusLost(): boolean {
  const active = document.activeElement
  return active === null || active === document.body
}

/**
 * Gives a lost focus back to an open layer after each render, while
 * `active`: to the part that `target` gives, the part that the layer
 * focuses as it opens. A render loses the focus when it takes away the part
 * that has it, such as a menu item that a change of the access drops. A
 * focus elsewhere stays. Each menu kit and each modal layer of the app uses
 * this one rule: the menu at a point, the sheets, the dialogs, the anchored
 * menus, and the menus of the chat.
 *
 * The check is an effect, not a layout effect, so it comes after the layout
 * effects of the render and after the effects of the parts inside the
 * layer. A part that moves the focus itself, such as choices that focus
 * their checked choice as they open in a sheet, then keeps that focus. Call
 * it after the effect that focuses the layer as it opens, so that the
 * opening focus comes first.
 */
export function useLostFocus(
  layer: RefObject<HTMLElement | null>,
  target: (layer: HTMLElement) => { focus(): void } | null,
  active = true,
): void {
  useEffect(() => {
    const node = layer.current
    if (!active || !node || !focusLost()) return
    target(node)?.focus()
  })
}

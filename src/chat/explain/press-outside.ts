/** The presses that keep the open popover, as `keepPopover` says. */
const kept = new WeakSet<Event>()

/**
 * Keeps the open popover at a press: a press in the popover, also in a part
 * that it opens over the page through a portal, such as a menu, or a press
 * on a mark, which opens its own popover or menu. React gives each such
 * press to the part before the document hears it. The shell's
 * `usePressOutside` reads the mark through `keepsPopover`.
 */
export function keepPopover(event: Event): void {
  kept.add(event)
}

/** Whether a press keeps the open popover, as `keepPopover` says. */
export function keepsPopover(event: Event): boolean {
  return kept.has(event)
}

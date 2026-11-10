/** The parts of a key press that choose a menu key. */
type KeyPress = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
>

/**
 * Shift and F10, or the Menu key, with no other modifier. These keys open
 * the menu of the focused element, such as a tab or a workspace row, on
 * every system.
 */
export function opensMenu(event: KeyPress): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey) return false
  if (event.key === 'ContextMenu') return !event.shiftKey
  return event.key === 'F10' && event.shiftKey
}

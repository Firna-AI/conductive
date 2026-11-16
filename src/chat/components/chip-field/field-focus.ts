import type { LexicalEditor } from 'lexical'

/** Whether the field has the focus, so that a change may place its caret. */
export function isFocused(editor: LexicalEditor): boolean {
  const root = editor.getRootElement()
  return root !== null && root.ownerDocument.activeElement === root
}

/**
 * Moves the focus into the field, with the caret of its editor state: where
 * it was, or at the end of the text, as a text field does.
 *
 * A change that waits to commit, such as a reconcile of the chips while the
 * field had no focus, can tell the editor to leave the caret of the page.
 * The focus would join that change and so leave the caret where the browser
 * put it, at the start. So that change commits first, on its own.
 */
export function focusField(editor: LexicalEditor): void {
  editor.read(() => undefined)
  editor.focus()
  const root = editor.getRootElement()
  if (root && root.ownerDocument.activeElement !== root) {
    root.focus({ preventScroll: true })
  }
}

/**
 * Takes the caret of the page out of a field that has no focus. That caret
 * can still stand in the field at an older place, and the editor reads it
 * at its next change outside an event, such as the change of a focus. Then
 * the editor would put that caret back into the field at a later change,
 * and a browser such as Chrome would give the field the focus. A caret
 * elsewhere on the page stays.
 */
export function releasePageCaret(editor: LexicalEditor): void {
  const root = editor.getRootElement()
  const selection = root?.ownerDocument.getSelection()
  if (!root || !selection || isFocused(editor)) return
  if (
    root.contains(selection.anchorNode) ||
    root.contains(selection.focusNode)
  ) {
    selection.removeAllRanges()
  }
}

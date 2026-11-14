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

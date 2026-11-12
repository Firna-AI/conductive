import type { LexicalEditor } from 'lexical'

/** Whether the field has the focus, so that a change may place its caret. */
export function isFocused(editor: LexicalEditor): boolean {
  const root = editor.getRootElement()
  return root !== null && root.ownerDocument.activeElement === root
}

/**
 * Moves the focus into the field, with the caret of its editor state: where
 * it was, or at the end of the text, as a text field does.
 */
export function focusField(editor: LexicalEditor): void {
  editor.focus()
  const root = editor.getRootElement()
  if (root && root.ownerDocument.activeElement !== root) {
    root.focus({ preventScroll: true })
  }
}

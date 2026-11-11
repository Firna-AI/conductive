import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  createEmptyHistoryState,
  HistoryPlugin,
  type HistoryState,
} from '@lexical/react/LexicalHistoryPlugin'
import type { LexicalEditor } from 'lexical'

/** The undo history of each field, outside React, so the field can seed it. */
const histories = new WeakMap<LexicalEditor, HistoryState>()

function historyOf(editor: LexicalEditor): HistoryState {
  const known = histories.get(editor)
  if (known) return known
  const history = createEmptyHistoryState()
  histories.set(editor, history)
  return history
}

/** Makes the content now the first state of a history that holds none. */
function seedHistory(editor: LexicalEditor): void {
  const history = historyOf(editor)
  if (history.current !== null) return
  history.current = { editor, editorState: editor.getEditorState() }
}

/**
 * The undo history of the field, with the content at mount as its first
 * state. So the first change, such as the removal of a chip with its ×, is
 * one step of undo, as in a plain text field. Without the seed, the editor
 * would record no state before the first change. A new value of the owner
 * clears the history and becomes the next first state, as `ValuePlugin`
 * says.
 */
export function UndoPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => seedHistory(editor), [editor])
  return <HistoryPlugin externalHistoryState={historyOf(editor)} />
}

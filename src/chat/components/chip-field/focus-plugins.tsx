import { useEffect, useImperativeHandle, type Ref } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $getSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  mergeRegister,
} from 'lexical'

/** Something that takes the focus, such as the handle of the field. */
export interface FieldHandle {
  focus(): void
}

/**
 * The handle of the field. Its focus puts the caret where it was, or at the
 * end of the text, as a text field does.
 */
export function FocusPlugin(props: { handle?: Ref<FieldHandle> }) {
  const [editor] = useLexicalComposerContext()
  useImperativeHandle(
    props.handle,
    () => ({
      focus: () => {
        editor.focus()
        const root = editor.getRootElement()
        if (root && root.ownerDocument.activeElement !== root) {
          root.focus({ preventScroll: true })
        }
      },
    }),
    [editor],
  )
  return null
}

/**
 * Puts the caret where it was, or at the end of the text, each time that
 * the field takes the focus without a press of the pointer, such as from
 * Tab. So a kept draft shows with the caret at its end. A browser puts the
 * caret of an editable element at its start instead. A press places the
 * caret where it lands, and an edit keeps the caret where the user puts it.
 *
 * "Where it was" is the caret of the last committed state of the editor.
 * Chrome puts its own caret at the start before the focus event, and a
 * field without a caret of its own reads that caret into the selection of
 * the update of the focus. So that selection cannot say where the caret was.
 */
export function CaretAtEndPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    let pressed = false
    let current: HTMLElement | null = null
    // A press that moves the focus into the field places its own caret.
    const press = (event: PointerEvent) => {
      const root = event.currentTarget
      pressed =
        root instanceof Element &&
        !root.contains(root.ownerDocument.activeElement)
    }
    return mergeRegister(
      editor.registerRootListener((root, previous) => {
        previous?.removeEventListener('pointerdown', press)
        root?.addEventListener('pointerdown', press)
        current = root
      }),
      () => current?.removeEventListener('pointerdown', press),
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          if (pressed) {
            pressed = false
            return false
          }
          const last = editor.getEditorState().read(() => $getSelection())
          if (last !== null) $setSelection(last.clone())
          else $getRoot().selectEnd()
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])
  return null
}

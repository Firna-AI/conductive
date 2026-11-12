import { useEffect, useImperativeHandle, type Ref, type RefObject } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $getSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  HISTORY_PUSH_TAG,
  mergeRegister,
} from 'lexical'
import { heldFile, useFieldFiles } from './attached-files'
import type { DropCaretControl } from './drop-caret'
import { focusField } from './field-focus'
import { $insertFiles } from './insert-files'
import type { FieldPoint } from './point-caret'
import { useLatest } from './use-latest'

/**
 * The handle of the field, for the composer that holds it. A point is a
 * point of the page, as `clientX` and `clientY` of a pointer event give it.
 */
export interface FieldHandle {
  /** Puts the focus in the field, with the caret where it was or at the end. */
  focus(): void
  /**
   * Puts a chip of each file of the draft into the text: at the place under
   * `point` when the point is over the text, else at the caret, else at the
   * end. The chips go in the order of `ids`, each with a space after it, as
   * one step of undo. The caret then stands after the last new chip, and the
   * field takes the focus. A file that the draft does not hold gets no chip,
   * so the files of `ids` must be in the draft at the call. A field that
   * takes no change puts no chip. The drop caret goes in each case.
   */
  insertFiles(ids: readonly string[], point?: FieldPoint): void
  /**
   * Draws the drop caret at the place under `point` while files hover over
   * the text, and hides it while the point is elsewhere. The caret and the
   * selection of the field do not change. A field that takes no change draws
   * no drop caret.
   */
  showDropCaret(point: FieldPoint): void
  /** Hides the drop caret, such as when the drag leaves, ends, or drops. */
  clearDropCaret(): void
}

/** The handle of the field, as `FieldHandle` says. */
export function HandlePlugin(props: {
  handle?: Ref<FieldHandle>
  dropCaret: RefObject<DropCaretControl | null>
}) {
  const [editor] = useLexicalComposerContext()
  const files = useLatest(useFieldFiles())
  const { dropCaret } = props
  useImperativeHandle(
    props.handle,
    () => ({
      focus: () => focusField(editor),
      insertFiles: (ids, point) => {
        dropCaret.current?.clear()
        if (!editor.isEditable()) return
        const held = ids.filter((id) => heldFile(files.current, id))
        if (held.length === 0) return
        editor.update(() => $insertFiles(editor, held, point), {
          discrete: true,
          tag: HISTORY_PUSH_TAG,
        })
        focusField(editor)
      },
      showDropCaret: (point) => {
        if (editor.isEditable()) dropCaret.current?.show(point)
        else dropCaret.current?.clear()
      },
      clearDropCaret: () => dropCaret.current?.clear(),
    }),
    [editor, files, dropCaret],
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

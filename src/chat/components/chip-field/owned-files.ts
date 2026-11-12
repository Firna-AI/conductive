import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $isElementNode,
  HISTORY_MERGE_TAG,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
} from 'lexical'
import {
  $isAttachedFileNode,
  type AttachedFileNode,
} from './attached-file-node'
import { heldFile, type FieldFiles } from './attached-files'
import { isFocused } from './field-focus'

/** The chips of the field whose files the draft does not hold now. */
function $unownedChips(files: FieldFiles): AttachedFileNode[] {
  return $getRoot()
    .getChildren()
    .flatMap((block) => ($isElementNode(block) ? block.getChildren() : []))
    .filter(
      (node): node is AttachedFileNode =>
        $isAttachedFileNode(node) && !heldFile(files, node.getFileId()),
    )
}

/**
 * Takes each chip whose file the draft does not hold out of the text. It
 * adds no step of undo, keeps the caret, and never takes the focus.
 */
function dropUnowned(editor: LexicalEditor, files: FieldFiles): void {
  const state = editor.getEditorState()
  if (state.read(() => $unownedChips(files).length === 0)) return
  const tag = isFocused(editor)
    ? [HISTORY_MERGE_TAG]
    : [HISTORY_MERGE_TAG, SKIP_DOM_SELECTION_TAG]
  editor.update(() => $unownedChips(files).forEach((node) => node.remove()), {
    tag,
  })
}

/** The IDs of the files of the draft, which change when a file comes or goes. */
function heldIds(files: FieldFiles): string {
  return JSON.stringify(files.files().map((item) => item.id))
}

/**
 * Keeps the chips of the field to the files of its draft. When a file
 * leaves the draft, its chip leaves the text after React draws the change,
 * so a new value of the owner that comes with the change wins. Undo and redo
 * cannot bring such a chip back: it leaves again after their change. A
 * detached file is still a file of the draft, so its chip stays. The text of
 * the field never holds the mark of a file that the draft does not hold, as
 * `$fieldText` says, so the owner never gets such a mark.
 */
export function OwnedFilesPlugin(props: { files: FieldFiles }) {
  const [editor] = useLexicalComposerContext()
  const { files } = props
  const subscribe = useCallback(
    (listener: () => void) => files.subscribe(listener),
    [files],
  )
  const read = () => heldIds(files)
  const held = useSyncExternalStore(subscribe, read, read)
  useLayoutEffect(() => dropUnowned(editor, files), [editor, files, held])
  useEffect(
    () => editor.registerUpdateListener(() => dropUnowned(editor, files)),
    [editor, files],
  )
  return null
}

import { useCallback, useSyncExternalStore } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, type NodeKey } from 'lexical'
import { DraftFileChip } from '../../../../docs/mockups/src/components/chat/DraftFileChip'
import type { DraftFile } from '../../../app/draft-files'
import {
  chipFileOf,
  chipUploadOf,
  heldFile,
  nameOf,
  useFieldFiles,
  type FieldFiles,
} from './attached-files'
import { focusField } from './field-focus'

/** The file of a chip, which each change of the files of the draft redraws. */
function useChipFile(
  files: FieldFiles | null,
  id: string,
): DraftFile | undefined {
  const subscribe = useCallback(
    (listener: () => void) =>
      files ? files.subscribe(listener) : () => undefined,
    [files],
  )
  const read = () => heldFile(files, id)
  return useSyncExternalStore(subscribe, read, read)
}

/**
 * The chip of an attached file in the field: the pure chip of the mockups,
 * with the live upload of its file. It redraws at each change of the file,
 * also while the field takes no change. The × removes the chip as one step
 * of undo, and Try again uploads a failed file again. Both do nothing while
 * the field takes no change. After Try again, the field takes the focus back,
 * because Try again goes away when the upload starts again. A chip whose file
 * the draft no longer holds draws nothing.
 */
export function FieldAttachedChip(props: { id: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()
  const files = useFieldFiles()
  const item = useChipFile(files, props.id)
  if (files === null || item === undefined) return null
  const remove = () => {
    if (!editor.isEditable()) return
    editor.update(() => $getNodeByKey(props.nodeKey)?.remove())
  }
  const retry = () => {
    if (!editor.isEditable()) return
    files.retry(item.id)
    focusField(editor)
  }
  return (
    <DraftFileChip
      file={chipFileOf(item)}
      onRetry={retry}
      removal={{ name: nameOf(item), onRemove: remove }}
      upload={chipUploadOf(item)}
    />
  )
}

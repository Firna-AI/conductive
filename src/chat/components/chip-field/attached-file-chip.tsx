import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from 'react'
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
import { FilePeekLayer, FilePreviewLayer } from './AttachedFilePreview'
import { focusField } from './field-focus'

/** How long a pointer rests on a chip before its card shows, in ms. */
const PEEK_DELAY_MS = 400

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
 * The card of a pointer that rests on a chip: it shows after the pointer
 * rested for `PEEK_DELAY_MS`, and it goes when the pointer leaves or
 * presses. Only a mouse or a pen rests, so a tap shows no card.
 */
function usePeek() {
  const [shown, setShown] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hide = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    setShown(false)
  }, [])
  useEffect(() => hide, [hide])
  const enter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      setShown(true)
    }, PEEK_DELAY_MS)
  }
  return { shown, enter, hide }
}

/**
 * The chip of an attached file in the field: the pure chip of the mockups,
 * with the live upload of its file. It redraws at each change of the file,
 * also while the field takes no change. The × removes the chip as one step
 * of undo, and Try again uploads a failed file again. Both do nothing while
 * the field takes no change. After Try again, the field takes the focus back,
 * because Try again goes away when the upload starts again. A chip whose file
 * the draft no longer holds draws nothing.
 *
 * A pointer that rests on the chip shows a card with the picture or the
 * first lines of the file, and a press on the name opens the preview of the
 * file in a dialog. Both read the copy of the file that the browser holds,
 * so they work in each state of the upload, also while the field takes no
 * change.
 */
export function FieldAttachedChip(props: { id: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()
  const files = useFieldFiles()
  const item = useChipFile(files, props.id)
  const anchor = useRef<HTMLSpanElement>(null)
  const peek = usePeek()
  const [open, setOpen] = useState(false)
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
  const file = { chip: chipFileOf(item), file: item.file }
  // The dialog sits beside the hover box, not inside it: React passes the
  // events of a portal to its React parents, so a pointer over the dimmed
  // app would else count as a pointer that rests on the chip.
  return (
    <>
      <span
        onPointerDown={peek.hide}
        onPointerEnter={peek.enter}
        onPointerLeave={peek.hide}
        ref={anchor}
      >
        <DraftFileChip
          file={file.chip}
          onOpen={() => {
            peek.hide()
            setOpen(true)
          }}
          onRetry={retry}
          removal={{ name: nameOf(item), onRemove: remove }}
          upload={chipUploadOf(item)}
        />
        {peek.shown && !open ? (
          <FilePeekLayer anchor={anchor} file={file} />
        ) : null}
      </span>
      {open ? (
        <FilePreviewLayer
          close={() => setOpen(false)}
          field={editor.getRootElement()}
          file={file}
        />
      ) : null}
    </>
  )
}

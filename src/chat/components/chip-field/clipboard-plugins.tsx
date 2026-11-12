import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $addUpdateTag,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COPY_COMMAND,
  CUT_COMMAND,
  CUT_TAG,
  DRAGEND_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  HISTORY_PUSH_TAG,
  mergeRegister,
  PASTE_COMMAND,
  PASTE_TAG,
  type LexicalNode,
  type PasteCommandType,
  type RangeSelection,
} from 'lexical'
import { draftParts } from '../../../app/draft-marks'
import { heldFile } from './attached-files'
import { $dropNodes } from './drop-move'
import { $selectedCopyText, $selectedFieldText } from './field-content'
import { $fieldNodes, $pastedNodes, type FieldSources } from './field-nodes'
import type { FieldOwner } from './field-plugins'
import { useFieldSources } from './mention-plugins'
import { $caretAtPoint } from './point-caret'
import { useLatest } from './use-latest'

/**
 * The last copy, cut, or drag of the field: the owner of the draft that it
 * came from, the plain text that it gave, and the text of the field, with the
 * mark of each attached file.
 */
interface KeptCopy {
  owner: FieldOwner
  plain: string
  field: string
}

/** Whether two plain texts are equal, whatever line ends a system writes. */
function sameText(a: string, b: string): boolean {
  const lines = (text: string) => text.replace(/\r\n?/g, '\n')
  return lines(a) === lines(b)
}

/** Whether the draft holds the file of each mark of a text of the field. */
function holdsFiles(field: string, sources: FieldSources): boolean {
  return draftParts(field).every(
    (part) =>
      part.kind === 'text' || heldFile(sources.files, part.id) !== undefined,
  )
}

/** The plain text of a paste or a drop. */
function plainOf(data: DataTransfer): string {
  return data.getData('text/plain') || data.getData('text/uri-list')
}

/**
 * The copy, the cut, the paste, and the drag of the field. A copy or a cut
 * gives only plain text: the exact link of each chip and the mention of each
 * file chip. A paste takes only plain text, as `$pastedNodes` says.
 *
 * A field that takes attached files does more. A copy, a cut, or a drag also
 * gives the mention of each ready attached file and the name of each other
 * attached file. The field keeps the text of its last copy, cut, or drag,
 * with the mark of each attached file, for the draft that it came from. A
 * paste or a drop in that draft whose plain text is that copy takes the kept
 * text, so each chip comes back with its file, also a file whose chip left
 * the text. When the draft no longer holds one of its files, the paste takes
 * the plain text, as any other paste does. A cut is its own step of undo. A
 * drag of text with a chip inside the field moves that text with its chips,
 * as one step of undo. A drop inside the dragged text keeps it as it was. A
 * drag of text alone moves as the editor moves it. A drop of files is the
 * drop of the message box, so the field leaves it alone.
 *
 * A field without attached files, such as that of Feedback, keeps no copy,
 * and its drag stays the drag of the editor and the browser.
 */
export function ClipboardPlugin(props: { owner: FieldOwner }) {
  const [editor] = useLexicalComposerContext()
  const sources = useFieldSources()
  const latest = useLatest({ owner: props.owner, sources })
  useEffect(() => {
    let kept: KeptCopy | null = null
    // A drag of this field runs, from its start to its drop or its end.
    let dragging = false
    // Whether the field takes attached files now.
    const takesFiles = () => latest.current.sources.files !== null
    const keep = (selection: RangeSelection): string => {
      const { owner, sources } = latest.current
      const { files } = sources
      const plain = $selectedCopyText(selection, files)
      const field = $selectedFieldText(selection, files)
      kept = files === null ? null : { owner, plain, field }
      return plain
    }
    const keptField = (plain: string): string | null => {
      const { owner, sources } = latest.current
      if (kept === null || kept.owner !== owner) return null
      if (!sameText(kept.plain, plain)) return null
      return holdsFiles(kept.field, sources) ? kept.field : null
    }
    const $nodesOf = (plain: string): LexicalNode[] => {
      const field = keptField(plain)
      const { sources } = latest.current
      return field === null
        ? $pastedNodes(plain, sources)
        : $fieldNodes(field, sources)
    }
    const copy = (
      event: ClipboardEvent | KeyboardEvent | null,
      cut: boolean,
    ) => {
      if (event === null || !('clipboardData' in event)) return false
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || selection.isCollapsed()) return false
      if (event.clipboardData === null) return false
      event.preventDefault()
      event.clipboardData.setData('text/plain', keep(selection))
      if (cut) {
        if (takesFiles()) $addUpdateTag(CUT_TAG)
        selection.removeText()
      }
      return true
    }
    const paste = (event: PasteCommandType) => {
      if (!('clipboardData' in event) || event.clipboardData === null) {
        return false
      }
      const text = plainOf(event.clipboardData)
      event.preventDefault()
      if (text === '') return true
      editor.update(
        () => {
          const selection = $getSelection()
          const target = $isRangeSelection(selection)
            ? selection
            : $getRoot().selectEnd()
          target.insertNodes($nodesOf(text))
        },
        { tag: PASTE_TAG },
      )
      return true
    }
    const dragStart = (event: DragEvent) => {
      const selection = $getSelection()
      const data = event.dataTransfer
      if (!takesFiles()) return false
      if (!$isRangeSelection(selection) || selection.isCollapsed()) return false
      if (data === null) return false
      dragging = true
      const plain = keep(selection)
      data.clearData()
      data.setData('text/plain', plain)
      // The plain text plugin then marks the drag as one of this editor.
      return false
    }
    const drop = (event: DragEvent) => {
      const moving = dragging
      dragging = false
      const data = event.dataTransfer
      if (!takesFiles()) return false
      if (data === null || data.types.includes('Files')) return false
      const plain = plainOf(data)
      const selection = $getSelection()
      const moved =
        moving && $isRangeSelection(selection) && !selection.isCollapsed()
          ? selection
          : null
      const takes = moved
        ? moved.getNodes().some($isDecoratorNode)
        : keptField(plain) !== null
      if (!takes) return false
      const caret = $caretAtPoint(editor, {
        x: event.clientX,
        y: event.clientY,
      })
      if (caret === null) return false
      event.preventDefault()
      $addUpdateTag(HISTORY_PUSH_TAG)
      $dropNodes(caret, moved, $nodesOf(plain))
      return true
    }
    const end = () => {
      dragging = false
      return false
    }
    const high = COMMAND_PRIORITY_HIGH
    return mergeRegister(
      editor.registerCommand(COPY_COMMAND, (event) => copy(event, false), high),
      editor.registerCommand(CUT_COMMAND, (event) => copy(event, true), high),
      editor.registerCommand(PASTE_COMMAND, paste, high),
      editor.registerCommand(DRAGSTART_COMMAND, dragStart, high),
      editor.registerCommand(DROP_COMMAND, drop, high),
      editor.registerCommand(DRAGEND_COMMAND, end, high),
    )
  }, [editor, latest])
  return null
}

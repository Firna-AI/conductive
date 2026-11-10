import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COPY_COMMAND,
  CUT_COMMAND,
  HISTORY_MERGE_TAG,
  KEY_ENTER_COMMAND,
  mergeRegister,
  PASTE_COMMAND,
  PASTE_TAG,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
} from 'lexical'
import { useChatLinks } from '../../links/LinksContext'
import {
  $fieldNodes,
  $fieldText,
  $reconcileLinks,
  $selectedFieldText,
  $setFieldText,
} from './field-content'

/** Whether the field has the focus, so that a change may place its caret. */
function focused(editor: LexicalEditor): boolean {
  const root = editor.getRootElement()
  return root !== null && root.ownerDocument.activeElement === root
}

/** The latest value of a prop, for a listener that the editor keeps. */
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

/**
 * The owner of the draft that a field shows, such as its `Draft.id`. The
 * field compares owners by identity.
 */
export type FieldOwner = string | object

/**
 * Keeps the field and the plain text of its owner in step. Each change of
 * the field gives its plain text. A new value from the owner, such as an
 * empty draft after a send or a draft that comes back, replaces the content
 * and clears the undo history, as a new value of a text field does. A new
 * owner does the same, also when its text is equal, so undo never gives the
 * text of one draft to another. The owner's echo of the field's own text
 * changes nothing, so the caret and the history stay.
 */
export function ValuePlugin(props: {
  owner: FieldOwner
  value: string
  onChangeText: (text: string) => void
}) {
  const [editor] = useLexicalComposerContext()
  const { links } = useChatLinks()
  // The owner and the text that the field shows now.
  const shown = useRef({ owner: props.owner, text: props.value })
  const onChange = useLatest(props.onChangeText)
  const latestLinks = useLatest(links)
  useEffect(
    () =>
      editor.registerUpdateListener((update) => {
        if (update.dirtyElements.size === 0 && update.dirtyLeaves.size === 0) {
          return
        }
        const text = update.editorState.read($fieldText)
        if (text === shown.current.text) return
        shown.current = { ...shown.current, text }
        onChange.current(text)
      }),
    [editor, onChange],
  )
  useLayoutEffect(() => {
    const { owner, text } = shown.current
    if (props.owner === owner && props.value === text) return
    shown.current = { owner: props.owner, text: props.value }
    const caret = focused(editor)
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
    editor.update(
      () => {
        $setFieldText(props.value, latestLinks.current)
        if (caret) $getRoot().selectEnd()
        else $setSelection(null)
      },
      { discrete: true, tag: caret ? [] : [SKIP_DOM_SELECTION_TAG] },
    )
  }, [editor, props.owner, props.value, latestLinks])
  return null
}

/**
 * A paste keeps only its plain text, from the paste event, and each pasted
 * workspace link becomes a chip at once. The paste is one step of undo.
 */
export function PastePlugin() {
  const [editor] = useLexicalComposerContext()
  const { links } = useChatLinks()
  const latestLinks = useLatest(links)
  useEffect(
    () =>
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!('clipboardData' in event) || event.clipboardData === null) {
            return false
          }
          const data = event.clipboardData
          const text =
            data.getData('text/plain') || data.getData('text/uri-list')
          event.preventDefault()
          if (text === '') return true
          editor.update(
            () => {
              const selection = $getSelection()
              const target = $isRangeSelection(selection)
                ? selection
                : $getRoot().selectEnd()
              target.insertNodes($fieldNodes(text, latestLinks.current))
            },
            { tag: PASTE_TAG },
          )
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, latestLinks],
  )
  return null
}

/**
 * A copy or a cut gives the plain text of the selection, with the exact
 * link of each chip and the spaces that keep each link apart.
 */
export function CopyPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    const copy = (
      event: ClipboardEvent | KeyboardEvent | null,
      cut: boolean,
    ) => {
      if (event === null || !('clipboardData' in event)) return false
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || selection.isCollapsed()) return false
      if (event.clipboardData === null) return false
      event.preventDefault()
      event.clipboardData.setData('text/plain', $selectedFieldText(selection))
      if (cut) selection.removeText()
      return true
    }
    return mergeRegister(
      editor.registerCommand(
        COPY_COMMAND,
        (event) => copy(event, false),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        CUT_COMMAND,
        (event) => copy(event, true),
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor])
  return null
}

/**
 * Enter goes to the owner first, such as the send key of a composer, which
 * says whether it took the key. While an input method composes a word, the
 * key belongs to the input method: no line and no send. Otherwise Enter
 * adds a line.
 */
export function EnterPlugin(props: {
  onEnter?: (event: KeyboardEvent) => boolean
}) {
  const [editor] = useLexicalComposerContext()
  const onEnter = useLatest(props.onEnter)
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (event === null) return false
          if (event.isComposing) return true
          return onEnter.current?.(event) ?? false
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, onEnter],
  )
  return null
}

/** The field takes no change while its owner says so, such as during a send. */
export function EditablePlugin(props: { editable: boolean }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => editor.setEditable(props.editable), [editor, props.editable])
  return null
}

/**
 * Brings the chips in line with each new list of the org, as
 * `$reconcileLinks` says. It adds no step of undo, keeps the caret, and
 * never takes the focus. A list that loads changes nothing.
 */
export function ReconcilePlugin() {
  const [editor] = useLexicalComposerContext()
  const { orgId, workspaces } = useChatLinks().links
  useEffect(() => {
    if (workspaces === null) return
    const tag = focused(editor)
      ? [HISTORY_MERGE_TAG]
      : [HISTORY_MERGE_TAG, SKIP_DOM_SELECTION_TAG]
    editor.update(() => $reconcileLinks({ orgId, workspaces }), { tag })
  }, [editor, orgId, workspaces])
  return null
}

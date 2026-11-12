import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $setSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  HISTORY_MERGE_TAG,
  KEY_ENTER_COMMAND,
  SKIP_DOM_SELECTION_TAG,
} from 'lexical'
import { useChatLinks } from '../../links/LinksContext'
import { $fieldText, $reconcileLinks } from './field-content'
import { isFocused } from './field-focus'
import { $setFieldText } from './field-nodes'
import { useFieldSources } from './mention-plugins'
import { useLatest } from './use-latest'

/**
 * The owner of the draft that a field shows, such as its `Draft.id`. The
 * field compares owners by identity.
 */
export type FieldOwner = string | object

/**
 * Keeps the field and the draft text of its owner in step. Each change of
 * the field gives its draft text, as `$fieldText` says. A new value from
 * the owner, such as an empty draft after a send or a draft that comes
 * back, replaces the content and clears the undo history, as a new value of
 * a text field does. A new owner does the same, also when its text is
 * equal, so undo never gives the text of one draft to another. The owner's
 * echo of the field's own text changes nothing, so the caret and the
 * history stay.
 */
export function ValuePlugin(props: {
  owner: FieldOwner
  value: string
  onChangeText: (text: string) => void
}) {
  const [editor] = useLexicalComposerContext()
  const sources = useFieldSources()
  // The owner and the text that the field shows now.
  const shown = useRef({ owner: props.owner, text: props.value })
  const onChange = useLatest(props.onChangeText)
  const latestSources = useLatest(sources)
  useEffect(
    () =>
      editor.registerUpdateListener((update) => {
        if (update.dirtyElements.size === 0 && update.dirtyLeaves.size === 0) {
          return
        }
        const { files } = latestSources.current
        const text = update.editorState.read(() => $fieldText(files))
        if (text === shown.current.text) return
        shown.current = { ...shown.current, text }
        onChange.current(text)
      }),
    [editor, onChange, latestSources],
  )
  useLayoutEffect(() => {
    const { owner, text } = shown.current
    if (props.owner === owner && props.value === text) return
    shown.current = { owner: props.owner, text: props.value }
    const caret = isFocused(editor)
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
    editor.update(
      () => {
        $setFieldText(props.value, latestSources.current)
        if (caret) $getRoot().selectEnd()
        else $setSelection(null)
      },
      { discrete: true, tag: caret ? [] : [SKIP_DOM_SELECTION_TAG] },
    )
  }, [editor, props.owner, props.value, latestSources])
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
    const tag = isFocused(editor)
      ? [HISTORY_MERGE_TAG]
      : [HISTORY_MERGE_TAG, SKIP_DOM_SELECTION_TAG]
    editor.update(() => $reconcileLinks({ orgId, workspaces }), { tag })
  }, [editor, orgId, workspaces])
  return null
}

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  COMMAND_PRIORITY_CRITICAL,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
} from 'lexical'
import {
  MentionList,
  type MentionListRow,
} from '../../../../docs/mockups/src/components/chat/MentionList'
import { useMenuLayer } from '../../../shell/ui/layers'
import {
  $triggerQuery,
  type MentionQuery,
  type MentionTrigger,
} from './mention-content'

/**
 * What a list of the field offers for a query: its rows, the best first,
 * and the one line in place of the rows, or null. Keep one value while the
 * source stays the same, so the rows are found once for each query.
 */
export interface MentionSource<Row> {
  rowsOf: (query: string) => readonly Row[]
  lineOf: (query: string, rows: number) => string | null
}

/** The id of a row of a list, which the field names as its active row. */
function rowIdOf(list: string, index: number): string {
  return `${list}-${index}`
}

/** The key of the trigger of a query, which Esc dismisses. */
function anchorOf(query: MentionQuery): string {
  return `${query.nodeKey}:${query.start}`
}

function sameQuery(a: MentionQuery | null, b: MentionQuery | null): boolean {
  if (a === null || b === null) return a === b
  return anchorOf(a) === anchorOf(b) && a.end === b.end && a.query === b.query
}

/**
 * A list of the field that its trigger opens, such as the list of `@`. The
 * trigger at the start of the text, or after a space or a line break, opens
 * it in `host`, just above the message box. The text from the trigger to the
 * caret is the query. The arrow keys move the highlight, Enter or Tab picks
 * the row, a press picks a row, and Esc closes the list. A space, or a caret
 * that leaves the query, closes it. A pick puts its chip in place of the
 * trigger and the query, as `pick` does inside an update of the editor.
 *
 * Without a source, the list never opens. The list closes when it has no
 * row and no line. While it shows no row, Enter stays in the list when
 * `keepsEnter` says so, and else goes on to the field, such as to send.
 */
export function MentionListPlugin<Row>(props: {
  host: HTMLElement | null
  trigger: MentionTrigger
  /** The id of the list, which the field names in `aria-controls`. */
  id: string
  /** The spoken name of the listbox, as `MentionList` takes it. */
  label?: string
  source: MentionSource<Row> | null
  keepsEnter: boolean
  pick: (query: MentionQuery, row: Row) => void
  listRow: (row: Row) => MentionListRow
}) {
  const { trigger, source, id } = props
  const [editor] = useLexicalComposerContext()
  const [query, setQuery] = useState<MentionQuery | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [highlight, setHighlight] = useState({ anchor: '', index: 0 })
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        const next = editor.isEditable()
          ? editorState.read(() => $triggerQuery(trigger))
          : null
        setQuery((now) => (sameQuery(now, next) ? now : next))
        if (next === null) setDismissed(null)
      }),
    [editor, trigger],
  )
  const anchor = query ? anchorOf(query) : null
  const active = query !== null && source !== null && anchor !== dismissed
  const rows = useMemo(
    () => (active ? source.rowsOf(query.query) : []),
    [active, source, query],
  )
  const line = active ? source.lineOf(query.query, rows.length) : null
  const open = active && (rows.length > 0 || line !== null)
  const highlightKey = `${anchor}:${query?.query}`
  const index =
    rows.length === 0
      ? null
      : highlight.anchor === highlightKey
        ? Math.min(highlight.index, rows.length - 1)
        : 0
  const pick = (at: number) => {
    const row = rows[at]
    if (!query || row === undefined) return
    editor.update(() => props.pick(query, row))
  }
  const dismiss = () => {
    if (anchor) setDismissed(anchor)
    return true
  }
  useMenuLayer(open, dismiss)
  useEffect(() => {
    if (!open) return undefined
    const move = (by: number, event: KeyboardEvent | null) => {
      if (rows.length === 0) return false
      event?.preventDefault()
      const from = index ?? 0
      const next = (from + by + rows.length) % rows.length
      setHighlight({ anchor: highlightKey, index: next })
      return true
    }
    const choose = (event: KeyboardEvent | null, consume: boolean) => {
      if (event?.shiftKey || event?.isComposing) return false
      if (index === null) {
        if (consume) event?.preventDefault()
        return consume
      }
      event?.preventDefault()
      pick(index)
      return true
    }
    const critical = COMMAND_PRIORITY_CRITICAL
    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => move(1, event),
        critical,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => move(-1, event),
        critical,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => choose(event, props.keepsEnter),
        critical,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => choose(event, false),
        critical,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          event.preventDefault()
          event.stopPropagation()
          return dismiss()
        },
        critical,
      ),
    )
  })
  useEffect(() => {
    const root = editor.getRootElement()
    if (!root || !open) return undefined
    root.setAttribute('aria-controls', id)
    root.setAttribute('aria-expanded', 'true')
    if (index !== null) {
      root.setAttribute('aria-activedescendant', rowIdOf(id, index))
    } else root.removeAttribute('aria-activedescendant')
    return () => {
      root.removeAttribute('aria-controls')
      root.removeAttribute('aria-expanded')
      root.removeAttribute('aria-activedescendant')
    }
  }, [editor, open, index, id])
  if (!open || !props.host) return null
  return createPortal(
    <MentionList
      highlighted={index}
      id={id}
      key={highlightKey}
      label={props.label}
      line={line}
      onHighlight={(at) => setHighlight({ anchor: highlightKey, index: at })}
      onPick={pick}
      rowId={(at) => rowIdOf(id, at)}
      rows={rows.map(props.listRow)}
    />,
    props.host,
  )
}

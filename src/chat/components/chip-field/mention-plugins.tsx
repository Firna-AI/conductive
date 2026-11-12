import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  COMMAND_PRIORITY_CRITICAL,
  HISTORY_MERGE_TAG,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
} from 'lexical'
import { allFilesUnavailable } from '../../../../docs/mockups/src/components/chat/lostCopy'
import { MentionList } from '../../../../docs/mockups/src/components/chat/MentionList'
import { useMenuLayer } from '../../../shell/ui/layers'
import { useChatLinks } from '../../links/LinksContext'
import { MentionIcon } from '../../mentions/MentionIcon'
import { folderLabel, mentionRows } from '../../mentions/mention-rows'
import {
  useMentionTree,
  type MentionTree,
} from '../../mentions/MentionsContext'
import { useFieldFiles } from './attached-files'
import type { FieldSources } from './field-nodes'
import {
  $mentionQuery,
  $pickMention,
  $reconcileMentions,
  registerWaitingMentions,
  type MentionQuery,
} from './mention-content'

/** What the field finds its chips in now. */
export function useFieldSources(): FieldSources {
  const { links } = useChatLinks()
  const tree = useMentionTree()
  const files = useFieldFiles()
  return useMemo(() => ({ links, tree, files }), [links, tree, files])
}

function focused(editor: LexicalEditor): boolean {
  const root = editor.getRootElement()
  return root !== null && root.ownerDocument.activeElement === root
}

/**
 * Brings the file chips in line with each new tree, as `$reconcileMentions`
 * says. It adds no step of undo, keeps the caret, and never takes the focus.
 * A mention that waits for its entry becomes text when typing continues it,
 * as `registerWaitingMentions` says.
 */
export function MentionReconcilePlugin() {
  const [editor] = useLexicalComposerContext()
  const tree = useMentionTree()
  useEffect(() => registerWaitingMentions(editor), [editor])
  useEffect(() => {
    if (!tree) return
    const tag = focused(editor)
      ? [HISTORY_MERGE_TAG]
      : [HISTORY_MERGE_TAG, SKIP_DOM_SELECTION_TAG]
    editor.update(() => $reconcileMentions(tree), { tag })
  }, [editor, tree])
  return null
}

/** The key of the `@` of a query, which Esc dismisses. */
function anchorOf(query: MentionQuery): string {
  return `${query.nodeKey}:${query.start}`
}

function sameQuery(a: MentionQuery | null, b: MentionQuery | null): boolean {
  if (a === null || b === null) return a === b
  return anchorOf(a) === anchorOf(b) && a.end === b.end && a.query === b.query
}

/** The one line of the list in place of its rows, or null. */
function lineOf(tree: MentionTree, query: string, rows: number): string | null {
  if (tree.state === 'loading') return 'Loading files…'
  if (tree.state === 'unavailable') return allFilesUnavailable.title
  return rows === 0 ? `Nothing matches “${query}”` : null
}

const listId = 'file-mention-list'
const rowId = (index: number) => `${listId}-${index}`

/**
 * The list of `@`. `@` at the start of the text, or after a
 * space or a line break, opens it in `host`, just above the message box.
 * The text from `@` to the caret filters it. The arrow keys move the
 * highlight, Enter or Tab picks the row, and Esc closes the list. While it
 * is open, Enter never sends. A pick puts the chip of the entry in place of
 * `@` and the query. A space, or a caret that leaves the query, closes it.
 */
export function MentionPlugin(props: { host: HTMLElement | null }) {
  const [editor] = useLexicalComposerContext()
  const tree = useMentionTree()
  const [query, setQuery] = useState<MentionQuery | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [highlight, setHighlight] = useState({ anchor: '', index: 0 })
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        const next = editor.isEditable()
          ? editorState.read($mentionQuery)
          : null
        setQuery((now) => (sameQuery(now, next) ? now : next))
        if (next === null) setDismissed(null)
      }),
    [editor],
  )
  const anchor = query ? anchorOf(query) : null
  const open = query !== null && tree !== null && anchor !== dismissed
  const rows = useMemo(
    () =>
      open && tree.state === 'ready'
        ? mentionRows(tree.entries.values(), query.query)
        : [],
    [open, tree, query],
  )
  const index =
    rows.length === 0
      ? null
      : highlight.anchor === `${anchor}:${query?.query}`
        ? Math.min(highlight.index, rows.length - 1)
        : 0
  const pick = (at: number) => {
    const entry = rows[at]
    if (!query || !entry) return
    editor.update(() => $pickMention(query, entry))
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
      setHighlight({ anchor: `${anchor}:${query?.query}`, index: next })
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
    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => move(1, event),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => move(-1, event),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => choose(event, true),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => choose(event, false),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          event.preventDefault()
          event.stopPropagation()
          return dismiss()
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    )
  })
  useEffect(() => {
    const root = editor.getRootElement()
    if (!root || !open) return undefined
    root.setAttribute('aria-controls', listId)
    root.setAttribute('aria-expanded', 'true')
    if (index !== null) root.setAttribute('aria-activedescendant', rowId(index))
    else root.removeAttribute('aria-activedescendant')
    return () => {
      root.removeAttribute('aria-controls')
      root.removeAttribute('aria-expanded')
      root.removeAttribute('aria-activedescendant')
    }
  }, [editor, open, index])
  if (!open || !props.host) return null
  return createPortal(
    <MentionList
      highlighted={index}
      id={listId}
      key={`${anchor}:${query.query}`}
      line={lineOf(tree, query.query, rows.length)}
      onHighlight={(at) =>
        setHighlight({ anchor: `${anchor}:${query.query}`, index: at })
      }
      onPick={pick}
      rowId={rowId}
      rows={rows.map((entry) => ({
        key: entry.path,
        name: entry.name,
        folder: folderLabel(entry),
        icon: <MentionIcon entry={entry} size={14} />,
      }))}
    />,
    props.host,
  )
}

import { useEffect, useMemo } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  HISTORY_MERGE_TAG,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
} from 'lexical'
import { allFilesUnavailable } from '../../../../docs/mockups/src/components/chat/lostCopy'
import type { FileEntry } from '../../../shared/files'
import { useChatLinks } from '../../links/LinksContext'
import { MentionIcon } from '../../mentions/MentionIcon'
import { folderLabel, mentionRows } from '../../mentions/mention-rows'
import { useMentionSkills } from '../../mentions/mention-skills'
import {
  useMentionTree,
  type MentionTree,
} from '../../mentions/MentionsContext'
import { useFieldFiles } from './attached-files'
import type { FieldSources } from './field-nodes'
import {
  $pickMention,
  $reconcileMentions,
  registerWaitingMentions,
} from './mention-content'
import { MentionListPlugin, type MentionSource } from './mention-list-plugin'
import { $reconcileSkills } from './skill-content'

/** What the field finds its chips in now. */
export function useFieldSources(): FieldSources {
  const { links } = useChatLinks()
  const tree = useMentionTree()
  const skills = useMentionSkills()
  const files = useFieldFiles()
  return useMemo(
    () => ({ links, tree, skills, files }),
    [links, tree, skills, files],
  )
}

function focused(editor: LexicalEditor): boolean {
  const root = editor.getRootElement()
  return root !== null && root.ownerDocument.activeElement === root
}

/** The tags of an update that adds no step of undo and keeps the focus. */
function quietTags(editor: LexicalEditor): string[] {
  return focused(editor)
    ? [HISTORY_MERGE_TAG]
    : [HISTORY_MERGE_TAG, SKIP_DOM_SELECTION_TAG]
}

/**
 * Brings the file chips in line with each new tree, as `$reconcileMentions`
 * says, and the skill chips with each new report of the skill lists, as
 * `$reconcileSkills` says. It adds no step of undo, keeps the caret, and
 * never takes the focus. A mention or a skill text that waits becomes text
 * when typing continues it, as `registerWaitingMentions` says.
 */
export function MentionReconcilePlugin() {
  const [editor] = useLexicalComposerContext()
  const tree = useMentionTree()
  const skills = useMentionSkills()
  useEffect(() => registerWaitingMentions(editor), [editor])
  useEffect(() => {
    if (!tree) return
    const tag = quietTags(editor)
    editor.update(() => $reconcileMentions(tree), { tag })
  }, [editor, tree])
  useEffect(() => {
    if (!skills) return
    const tag = quietTags(editor)
    editor.update(() => $reconcileSkills(skills), { tag })
  }, [editor, skills])
  return null
}

/** The one line of the list in place of its rows, or null. */
function lineOf(tree: MentionTree, query: string, rows: number): string | null {
  if (tree.state === 'loading') return 'Loading files…'
  if (tree.state === 'unavailable') return allFilesUnavailable.title
  return rows === 0 ? `Nothing matches “${query}”` : null
}

/**
 * The list of `@`, as `MentionListPlugin` opens it, with the files and the
 * folders of the tree. While it is open, Enter never sends: with no match,
 * the list says so. A pick puts the chip of the entry in place of `@` and
 * the query.
 */
export function MentionPlugin(props: { host: HTMLElement | null }) {
  const tree = useMentionTree()
  const source = useMemo(
    (): MentionSource<FileEntry> | null =>
      tree && {
        rowsOf: (query) =>
          tree.state === 'ready'
            ? mentionRows(tree.entries.values(), query)
            : [],
        lineOf: (query, rows) => lineOf(tree, query, rows),
      },
    [tree],
  )
  return (
    <MentionListPlugin
      host={props.host}
      id="file-mention-list"
      keepsEnter
      listRow={(entry) => ({
        key: entry.path,
        name: entry.name,
        folder: folderLabel(entry),
        icon: <MentionIcon entry={entry} size={14} />,
      })}
      pick={$pickMention}
      source={source}
      trigger="@"
    />
  )
}

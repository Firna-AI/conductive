import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  type LexicalNode,
} from 'lexical'
import { draftParts } from '../../../app/draft-marks'
import {
  linkTarget,
  namesOrgWorkspace,
  textParts,
  type WorkspaceLinks,
} from '../../links/workspace-links'
import { mentionParts, type Mention } from '../../../shared/mention-text'
import { findMentioned, type MentionTree } from '../../mentions/MentionsContext'
import { $createAttachedFileNode } from './attached-file-node'
import { fileOfMention, heldFile, type FieldFiles } from './attached-files'
import { $createLinkTextNode, $createWorkspaceChipNode } from './chip-nodes'
import {
  $createFileMentionNode,
  $createMentionTextNode,
} from './file-mention-nodes'

/**
 * What the field finds its chips in: the workspaces of the org, the file
 * tree of the workspace, and the attached files of the draft. `tree` is null
 * in a field that takes no mentions, such as the message of New workspace.
 * `files` is null in a field that takes no files, such as that of Feedback.
 */
export interface FieldSources {
  links: WorkspaceLinks
  tree: MentionTree | null
  files: FieldFiles | null
}

/** Text as the nodes of a plain text field: text, line breaks, and tabs. */
function $rawNodes(text: string): LexicalNode[] {
  return text
    .split(/(\r\n|\r|\n|\t)/)
    .filter((piece) => piece !== '')
    .map((piece) =>
      piece === '\t'
        ? $createTabNode()
        : /^[\r\n]+$/.test(piece)
          ? $createLineBreakNode()
          : $createTextNode(piece),
    )
}

/** The nodes of plain text, where each workspace link can be a chip. */
function $linkNodes(text: string, links: WorkspaceLinks): LexicalNode[] {
  return textParts(text).flatMap((part): LexicalNode[] => {
    if (part.kind !== 'link') return $rawNodes(part.text)
    if (linkTarget(part.href, links)) {
      return [$createWorkspaceChipNode(part.source, part.href)]
    }
    if (namesOrgWorkspace(part.href, links.orgId)) {
      return [$createLinkTextNode(part.source, part.href)]
    }
    return $rawNodes(part.source)
  })
}

/**
 * The node of a mention: a chip when the tree holds its entry, else text
 * that can become a chip when the tree holds it later.
 */
function $mentionNode(mention: Mention, tree: MentionTree): LexicalNode {
  return findMentioned(tree, mention.path, mention.folder)
    ? $createFileMentionNode(mention.source)
    : $createMentionTextNode(mention.source)
}

/**
 * The nodes of plain text. A link to a workspace of the list becomes a chip.
 * A link to a page of a workspace of the org that the list does not hold yet
 * stays text that can become a chip later. Every other link stays text.
 * Where the field takes mentions, a mention of an entry of the tree becomes
 * a chip, and every other mention stays text that can become a chip later.
 */
function $textNodes(text: string, sources: FieldSources): LexicalNode[] {
  const { tree } = sources
  if (!tree) return $linkNodes(text, sources.links)
  return mentionParts(text).flatMap((part): LexicalNode[] =>
    part.kind === 'text'
      ? $linkNodes(part.text, sources.links)
      : [$mentionNode(part, tree)],
  )
}

/**
 * The nodes of a text of the field, such as a draft that comes back or the
 * kept text of a copy. In a field that takes attached files, the text is
 * the draft text of `draftParts`: each mark of a file that the draft holds
 * becomes the chip of that file, and a mark of any other file goes. Each
 * other part is literal text, with each character that the draft escaped.
 * A field without attached files keeps the whole text, as typed text. The
 * literal text gives its chips as `$textNodes` says.
 */
export function $fieldNodes(
  text: string,
  sources: FieldSources,
): LexicalNode[] {
  if (sources.files === null) return $textNodes(text, sources)
  return draftParts(text).flatMap((part): LexicalNode[] => {
    if (part.kind === 'text') return $textNodes(part.text, sources)
    return heldFile(sources.files, part.id)
      ? [$createAttachedFileNode(part.id)]
      : []
  })
}

/**
 * The nodes of a plain text from a paste or a drop. The text is literal, as
 * typed text is, so it can make no mark. In a field that takes attached
 * files, a mention of the copy path of a ready file that the draft holds
 * becomes the chip of that file, also of a file whose chip left the text.
 * A field without attached files keeps the whole text, as typed text. The
 * rest of the text gives its chips as `$textNodes` says.
 */
export function $pastedNodes(
  text: string,
  sources: FieldSources,
): LexicalNode[] {
  if (sources.files === null) return $textNodes(text, sources)
  const held = sources.files.files()
  if (!held.some((item) => item.state === 'ready')) {
    return $textNodes(text, sources)
  }
  const nodes: LexicalNode[] = []
  let rest = ''
  for (const part of mentionParts(text)) {
    const file = part.kind === 'mention' ? fileOfMention(held, part) : undefined
    if (file === undefined) {
      rest += part.kind === 'text' ? part.text : part.source
      continue
    }
    nodes.push(...$textNodes(rest, sources), $createAttachedFileNode(file.id))
    rest = ''
  }
  return [...nodes, ...$textNodes(rest, sources)]
}

/** Puts a plain text in the field, with its chips, in place of its content. */
export function $setFieldText(text: string, sources: FieldSources): void {
  const paragraph = $createParagraphNode()
  paragraph.append(...$fieldNodes(text, sources))
  $getRoot().clear().append(paragraph)
}

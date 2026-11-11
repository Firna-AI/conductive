import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
  type RangeSelection,
} from 'lexical'
import {
  linkTarget,
  namesOrgWorkspace,
  textParts,
  type WorkspaceLinks,
} from '../../links/workspace-links'
import { mentionParts, type Mention } from '../../../shared/mention-text'
import { findMentioned, type MentionTree } from '../../mentions/MentionsContext'
import {
  $createLinkTextNode,
  $createWorkspaceChipNode,
  $isLinkTextNode,
  $isWorkspaceChipNode,
} from './chip-nodes'
import { joinFieldParts, type FieldPart } from './field-text'
import {
  $createFileMentionNode,
  $createMentionTextNode,
  $isFileMentionNode,
} from './file-mention-nodes'

/**
 * What the field finds its chips in: the workspaces of the org, and the
 * file tree of the workspace. `tree` is null in a field that takes no
 * mentions, such as the message of New workspace.
 */
export interface FieldSources {
  links: WorkspaceLinks
  tree: MentionTree | null
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
 * The nodes of a plain text from a paste or a draft. A link to a workspace
 * of the list becomes a chip. A link to a page of a workspace of the org
 * that the list does not hold yet stays text that can become a chip later.
 * Every other link stays text. Where the field takes mentions, a mention of
 * an entry of the tree becomes a chip, and every other mention stays text
 * that can become a chip later.
 */
export function $fieldNodes(
  text: string,
  sources: FieldSources,
): LexicalNode[] {
  const { tree } = sources
  if (!tree) return $linkNodes(text, sources.links)
  return mentionParts(text).flatMap((part): LexicalNode[] =>
    part.kind === 'text'
      ? $linkNodes(part.text, sources.links)
      : [$mentionNode(part, tree)],
  )
}

/** Puts a plain text in the field, with its chips, in place of its content. */
export function $setFieldText(text: string, sources: FieldSources): void {
  const paragraph = $createParagraphNode()
  paragraph.append(...$fieldNodes(text, sources))
  $getRoot().clear().append(paragraph)
}

/** The part of a node for the plain text, or null for an element. */
function partOf(node: LexicalNode, from = 0, to?: number): FieldPart | null {
  if ($isWorkspaceChipNode(node)) {
    return { kind: 'chip', source: node.getTextContent() }
  }
  if ($isFileMentionNode(node)) {
    return { kind: 'chip', source: node.getTextContent(), mention: true }
  }
  if ($isLineBreakNode(node)) return { kind: 'text', text: '\n' }
  if ($isTextNode(node)) {
    return { kind: 'text', text: node.getTextContent().slice(from, to) }
  }
  return null
}

/** The plain text of the whole field, with the exact link of each chip. */
export function $fieldText(): string {
  const parts: FieldPart[] = []
  $getRoot()
    .getChildren()
    .forEach((block, index) => {
      if (index > 0) parts.push({ kind: 'text', text: '\n' })
      const children = $isElementNode(block) ? block.getChildren() : [block]
      for (const node of children) {
        const part = partOf(node)
        if (part) parts.push(part)
      }
    })
  return joinFieldParts(parts)
}

/** The plain text of a selection, as a copy gives it. */
export function $selectedFieldText(selection: RangeSelection): string {
  const [start, end] = selection.isBackward()
    ? [selection.focus, selection.anchor]
    : [selection.anchor, selection.focus]
  const parts: FieldPart[] = []
  for (const node of selection.getNodes()) {
    const from = start.type === 'text' && start.key === node.getKey()
    const to = end.type === 'text' && end.key === node.getKey()
    const part = partOf(
      node,
      from ? start.offset : 0,
      to ? end.offset : undefined,
    )
    if (part) parts.push(part)
  }
  return joinFieldParts(parts)
}

/**
 * Brings the chips of the field in line with the list. A chip whose
 * workspace left the list becomes ordinary text. A link of a paste or a
 * draft whose workspace the list now holds becomes a chip. A caret inside
 * such a link goes after its chip. Typed text never changes.
 */
export function $reconcileLinks(links: WorkspaceLinks): void {
  const selection = $getSelection()
  for (const node of $getRoot().getAllTextNodes()) {
    if (!$isLinkTextNode(node) || !node.isLink()) continue
    if (!linkTarget(node.getHref(), links)) continue
    const chip = $createWorkspaceChipNode(node.getTextContent(), node.getHref())
    const holdsCaret =
      $isRangeSelection(selection) &&
      [selection.anchor, selection.focus].some(
        (point) => point.key === node.getKey(),
      )
    node.replace(chip)
    if (holdsCaret) chip.selectNext(0, 0)
  }
  const inline = $getRoot()
    .getChildren()
    .flatMap((block) => ($isElementNode(block) ? block.getChildren() : []))
  for (const node of inline) {
    if (!$isWorkspaceChipNode(node) || linkTarget(node.getHref(), links)) {
      continue
    }
    node.replace($createTextNode(node.getTextContent()))
  }
}

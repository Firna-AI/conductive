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
import {
  $createLinkTextNode,
  $createWorkspaceChipNode,
  $isLinkTextNode,
  $isWorkspaceChipNode,
} from './chip-nodes'
import { joinFieldParts, type FieldPart } from './field-text'

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

/**
 * The nodes of a plain text from a paste or a draft. A link to a workspace
 * of the list becomes a chip. A link to a page of a workspace of the org
 * that the list does not hold yet stays text that can become a chip later.
 * Every other link stays text.
 */
export function $fieldNodes(
  text: string,
  links: WorkspaceLinks,
): LexicalNode[] {
  return textParts(text, false).flatMap((part): LexicalNode[] => {
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

/** Puts a plain text in the field, with its chips, in place of its content. */
export function $setFieldText(text: string, links: WorkspaceLinks): void {
  const paragraph = $createParagraphNode()
  paragraph.append(...$fieldNodes(text, links))
  $getRoot().clear().append(paragraph)
}

/** The part of a node for the plain text, or null for an element. */
function partOf(node: LexicalNode, from = 0, to?: number): FieldPart | null {
  if ($isWorkspaceChipNode(node)) {
    return { kind: 'chip', source: node.getTextContent() }
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

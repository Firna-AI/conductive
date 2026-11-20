import type { FileEntry } from '../../shared/generated/FileEntry'
import type { EntryLookup } from '../links/file-targets'
import { webLinkOf } from '../links/links-test-kit'
import type { WorkspaceLinks } from '../links/workspace-links'
import { agentBlocks, type TextBlock } from './agent-blocks'
import type { InlineText } from './agent-inline'
import {
  answerParts,
  type AnswerPart,
  type AnswerReading,
} from './answer-parts'

// The helpers of the tests of the reading of the text of agent messages.

/** The first inline text of the blocks, at any depth, such as of a list item. */
function firstText(blocks: readonly TextBlock[]): InlineText | undefined {
  for (const block of blocks) {
    if (block.kind === 'p' || block.kind === 'heading') return block.text
    if (block.kind === 'table') return block.head[0]
    const inner =
      block.kind === 'quote'
        ? firstText(block.blocks)
        : block.kind === 'ul' || block.kind === 'ol'
          ? firstText(block.items.flatMap((item) => item.blocks))
          : undefined
    if (inner) return inner
  }
  return undefined
}

/**
 * The reading of the chat of a workspace whose servers run, with the
 * workspaces of `links` and, with `entries`, a tree of them under `root`.
 */
export function readingOf(
  links: WorkspaceLinks,
  entries?: readonly FileEntry[],
  root: string | null = null,
): AnswerReading {
  if (!entries) return { links, web: webLinkOf }
  const find: EntryLookup = (path, folder) =>
    entries.find(
      (entry) => entry.path === path && (entry.kind === 'directory') === folder,
    )
  return { links, web: webLinkOf, files: { find, root } }
}

/** The parts of the first text of an agent message, as the chat reads it. */
export function partsOf(text: string, reading: AnswerReading): AnswerPart[] {
  return answerParts(firstText(agentBlocks(text)) ?? [], reading)
}

/** Parts in a short form, as `shapeOf` gives each. */
export function shapes(parts: readonly AnswerPart[]): unknown[] {
  return parts.map(shapeOf)
}

/** The words of parts as one text, without their marks. */
function wordsOf(parts: readonly AnswerPart[]): string {
  return parts
    .map((part) => {
      if (part.kind === 'text' || part.kind === 'code') return part.text
      if (part.kind === 'mark') return wordsOf(part.parts)
      return part.kind === 'break' ? '\n' : ''
    })
    .join('')
}

/**
 * A part in a short form: text, code with the kind of its link, a line
 * break, a mark with its parts, the ID and page of a chip, a web link as
 * the kind of its address and its words, a file with its source, and a
 * link to a file with its label. Lines show only when the part has them.
 */
function shapeOf(part: AnswerPart): unknown {
  switch (part.kind) {
    case 'text':
      return { text: part.text }
    case 'code':
      return part.link
        ? { code: part.text, link: part.link.kind }
        : { code: part.text }
    case 'break':
      return { break: true }
    case 'mark':
      return { [part.mark]: shapes(part.parts) }
    case 'chip':
      return { chip: part.target.workspace.id, to: part.target.to }
    case 'link':
      return { [part.link.kind]: wordsOf(part.words) }
    case 'file':
      return {
        file: part.entry.path,
        source: part.source,
        ...(part.lines ? { lines: part.lines } : {}),
      }
    case 'file-link':
      return {
        link: part.entry.path,
        label: wordsOf(part.label),
        ...(part.lines ? { lines: part.lines } : {}),
      }
  }
}

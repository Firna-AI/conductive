import { changelogSections, type ChangelogSection } from './changelog-model'
import { plainText } from './changelog-text'

/** The lead and the changes of each section of a post, from its body. */
type PostBody = {
  readonly lead?: string
  readonly sections: Partial<Record<ChangelogSection, string[]>>
}

/**
 * A block of the body: a heading, a paragraph, an item of a list, or other
 * text, such as a quote or code. A block of text holds each of its lines.
 */
type Block =
  | { readonly kind: 'heading'; readonly level: number; readonly text: string }
  | { readonly kind: 'paragraph' | 'item' | 'other'; readonly lines: string[] }

type TextBlock = Extract<Block, { lines: string[] }>

const atxHeading = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/
/** The line under a heading of two lines: `=` for level one, `-` for two. */
const underline = /^ {0,3}(=+|-+)[ \t]*$/
/** A rule, or the definition of a link, which show no words. */
const wordless = /^ {0,3}(?:([-*_])(?:[ \t]*\1){2,}[ \t]*|\[[^\]]+\]:.*)$/
/** The start of a block of code. A run of backticks with more after it is a code mark. */
const fence = /^[ \t]*(?:(`{3,})[^`]*|(~{3,}).*)$/
const quote = /^ {0,3}>/
const listItem = /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$/
/** A line indented under an item, which continues it after a blank line. */
const indented = /^(?: {2,}|\t)/

/** Whether a line closes the block of code that a run of backticks or tildes opened. */
function closes(line: string, run: string): boolean {
  const closing = line.trim()
  return (
    closing.startsWith(run) && [...closing].every((mark) => mark === run[0])
  )
}

/**
 * The blocks of the Markdown of a body, in their order. A list item that is
 * indented under another item is its own item, because a post has one change
 * on each line. A comment shows nothing, as in Markdown.
 */
function blocksOf(markdown: string): Block[] {
  const blocks: Block[] = []
  let open: TextBlock | undefined
  let afterBlank = false
  let fenceRun: string | undefined
  const start = (block: Block) => {
    blocks.push(block)
    open = block.kind === 'heading' ? undefined : block
  }
  for (const line of markdown.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
    if (line.trim() === '' && fenceRun === undefined) {
      afterBlank = true
      continue
    }
    const continues = open !== undefined && !afterBlank
    const fenceStart = fence.exec(line)
    const heading = atxHeading.exec(line)
    if (fenceRun !== undefined) {
      if (closes(line, fenceRun)) {
        fenceRun = undefined
        open = undefined
      }
    } else if (
      underline.test(line) &&
      continues &&
      open?.kind === 'paragraph'
    ) {
      const level = line.trim().startsWith('=') ? 1 : 2
      blocks[blocks.length - 1] = {
        kind: 'heading',
        level,
        text: open.lines.join(' '),
      }
      open = undefined
    } else if (wordless.test(line)) {
      open = undefined
    } else if (fenceStart) {
      start({ kind: 'other', lines: [line] })
      fenceRun = fenceStart[1] ?? fenceStart[2]
    } else if (heading) {
      start({
        kind: 'heading',
        level: heading[1]?.length ?? 1,
        text: heading[2] ?? '',
      })
    } else if (quote.test(line) && !(continues && open?.kind === 'other')) {
      start({ kind: 'other', lines: [line] })
    } else if (listItem.test(line)) {
      start({ kind: 'item', lines: [listItem.exec(line)?.[1] ?? ''] })
    } else if (
      open &&
      (continues || (open.kind === 'item' && indented.test(line)))
    ) {
      open.lines.push(line)
    } else {
      start({ kind: 'paragraph', lines: [line] })
    }
    afterBlank = false
  }
  return blocks
}

/** The section that a heading starts: a level-two heading with its name. */
function sectionOf(level: number, words: string): ChangelogSection | undefined {
  const name = words.toLowerCase()
  return level === 2
    ? changelogSections.find((section) => section === name)
    : undefined
}

/** The start of a text that stays off the page, to name it in a warning. */
function excerpt(words: string): string {
  return words.length > 60 ? `${words.slice(0, 59)}…` : words
}

/**
 * The lead and the sections of the body of a post, as
 * docs/protocol/website-changelog.md says. The lead is the first paragraph
 * before the first section. Each section starts at its level-two heading,
 * and its list gives one change on each line. Another heading stays off the
 * page with its list. Other text stays off the page too. Each case warns.
 */
export function readBody(
  markdown: string,
  warn: (problem: string) => void,
): PostBody {
  const sections: Partial<Record<ChangelogSection, string[]>> = {}
  const seen = new Set<ChangelogSection>()
  let place: ChangelogSection | 'top' | 'other heading' = 'top'
  let lead: string | undefined
  for (const block of blocksOf(markdown)) {
    if (block.kind === 'heading') {
      const words = plainText(block.text)
      const section = sectionOf(block.level, words)
      if (section === undefined) {
        warn(
          `the heading "${words}" at level ${block.level} is not New, Improved, or Fixed at level two, so it stays off the page with its list.`,
        )
      } else if (seen.has(section)) {
        warn(
          `the section "${words}" comes more than once, so the page joins their lines.`,
        )
      }
      if (section !== undefined) seen.add(section)
      place = section ?? 'other heading'
      continue
    }
    const words = plainText(block.lines.join('\n'))
    if (words === '') continue
    if (block.kind === 'item' && place !== 'top') {
      if (place !== 'other heading') (sections[place] ??= []).push(words)
    } else if (
      block.kind === 'paragraph' &&
      seen.size === 0 &&
      lead === undefined
    ) {
      lead = words
    } else {
      warn(
        `the text "${excerpt(words)}" is outside the lead and the lists of the sections, so it stays off the page.`,
      )
    }
  }
  return lead === undefined ? { sections } : { lead, sections }
}

import { indentOf, isRule } from '../../markdown/lines'
import type { TextBlock } from './agent-text'

/** Whether the line starts a quote, which the chat shows as text. */
export function isQuote(line: string): boolean {
  return /^ {0,3}>/.test(line)
}

/**
 * The lines of the paragraph that the parser of an answer reads, up to the
 * next block. The chat shows a quote, a rule, and indented code as text, so
 * one paragraph can hold them. CommonMark reads none of them as the text of
 * a paragraph, so an underline turns only the text after the last of them
 * into a heading. A quote also takes the lines after it, as CommonMark
 * reads them as lazy lines of the quote.
 */
export class Paragraph {
  private lines: string[] = []
  private isOpen = false
  /** The line where the text that an underline turns into a heading starts. */
  private text: number | null = null
  /** Whether a quote takes the lines after it. */
  private quoted = false

  /**
   * Whether the last line is text, so the paragraph is open. A rule shows
   * as text too, but it closes the paragraph.
   */
  get open(): boolean {
    return this.isOpen
  }

  /**
   * Adds a line. A lazy line, an unindented line of a list item, starts no
   * text that an underline turns into a heading. Nor does a line indented by
   * four spaces, which CommonMark reads as code there.
   */
  add(line: string, lazy: boolean): void {
    if (isRule(line)) {
      this.text = null
      this.quoted = false
    } else if (isQuote(line)) {
      this.text = null
      this.quoted = true
    } else if (this.text === null && !this.quoted && !lazy) {
      if (indentOf(line) < 4) this.text = this.lines.length
    }
    this.lines.push(line.trim())
    this.isOpen = !isRule(line)
  }

  /** The paragraph as a block, or none without lines. It then starts empty. */
  take(): TextBlock[] {
    const blocks: TextBlock[] =
      this.lines.length > 0 ? [{ kind: 'p', text: this.lines.join(' ') }] : []
    this.lines = []
    this.isOpen = false
    this.text = null
    this.quoted = false
    return blocks
  }

  /**
   * The blocks that an underline of `level` makes: the lines before the text
   * as a paragraph, and the text as a heading. Null, with no change, when no
   * text comes before the underline.
   */
  underline(level: 1 | 2): TextBlock[] | null {
    if (this.text === null) return null
    const heading = this.lines.splice(this.text).join(' ')
    return [...this.take(), { kind: 'heading', level, text: heading }]
  }
}

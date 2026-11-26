/** The text that one indent step adds or removes. */
const indentUnit = '  '

/**
 * A change of the text of a code field: the text from `from` to `to`
 * becomes `text`, and then `selection` holds the selected range.
 */
export interface CodeEdit {
  from: number
  to: number
  text: string
  selection: readonly [number, number]
}

/** The key of a key press that a code field handles itself. */
export type CodeKey = 'indent' | 'outdent' | 'newline'

/** The start of the line that holds `index`. */
function lineStart(value: string, index: number): number {
  return index === 0 ? 0 : value.lastIndexOf('\n', index - 1) + 1
}

/** The end of the line that holds `index`, before its line break. */
function lineEnd(value: string, index: number): number {
  const end = value.indexOf('\n', index)
  return end < 0 ? value.length : end
}

/**
 * The lines that a selection touches. A selection that ends at the start
 * of a line leaves that line out, as code editors do.
 */
function touchedLines(value: string, start: number, end: number) {
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end
  const from = lineStart(value, start)
  return { from, to: lineEnd(value, Math.max(from, last)) }
}

/** Each line of `block` with one indent step more, or one step less. */
function shiftLines(block: string, outdent: boolean): string[] {
  return block.split('\n').map((line) => {
    if (!outdent) return line === '' ? line : indentUnit + line
    const spaces = /^ {0,2}/.exec(line)?.[0].length ?? 0
    return line.startsWith('\t') ? line.slice(1) : line.slice(spaces)
  })
}

/**
 * Indents or outdents every line of a selection. A line that is empty
 * stays empty. The selection then covers the changed lines.
 */
function shiftSelection(
  value: string,
  start: number,
  end: number,
  outdent: boolean,
): CodeEdit {
  const { from, to } = touchedLines(value, start, end)
  const lines = shiftLines(value.slice(from, to), outdent)
  const text = lines.join('\n')
  if (start !== end) {
    return { from, to, text, selection: [from, from + text.length] }
  }
  const firstLength = lineEnd(value, from) - from
  const caret = Math.max(from, start + (lines[0] ?? '').length - firstLength)
  return { from, to, text, selection: [caret, caret] }
}

/**
 * The edit that a key press makes in a code field, or null when the field
 * leaves the key to the browser. Tab indents: it inserts one indent step
 * at the caret, or indents every line of a selection, so a selection
 * never turns into spaces. Shift+Tab outdents the lines of the caret or
 * of the selection. Enter starts the new line with the indent of the line
 * of the caret.
 */
export function codeKeyEdit(
  key: CodeKey,
  value: string,
  start: number,
  end: number,
): CodeEdit | null {
  if (key === 'newline') {
    const from = lineStart(value, start)
    const indent = /^[ \t]*/.exec(value.slice(from, start))?.[0] ?? ''
    const text = `\n${indent}`
    const caret = start + text.length
    return { from: start, to: end, text, selection: [caret, caret] }
  }
  if (key === 'indent' && start === end) {
    const caret = start + indentUnit.length
    return { from: start, to: end, text: indentUnit, selection: [caret, caret] }
  }
  const edit = shiftSelection(value, start, end, key === 'outdent')
  return value.slice(edit.from, edit.to) === edit.text ? null : edit
}

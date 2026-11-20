/*
 * Adapted from markdown-it 15.0.3, rules_block/table.ts.
 * Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import type { StateBlock } from 'markdown-it'

/** A row from the parser's current container, without its indentation. */
export function tableLine(state: StateBlock, line: number): string {
  return state.src.slice(
    state.bMarks[line] + state.tShift[line],
    state.eMarks[line],
  )
}

/** The library's escaped-pipe split, including a zero-cell row of one pipe. */
export function tableColumns(line: string): string[] {
  const result: string[] = []
  let escaped = false
  let last = 0
  let current = ''
  for (let pos = 0; pos < line.length; pos += 1) {
    const char = line[pos]
    if (char === '|') {
      if (!escaped) {
        result.push(current + line.slice(last, pos))
        current = ''
        last = pos + 1
      } else {
        current += line.slice(last, pos - 1)
        last = pos
      }
    }
    escaped = char === '\\'
  }
  result.push(current + line.slice(last))
  if (result[0] === '') result.shift()
  if (result.at(-1) === '') result.pop()
  return result
}

/** Reads the header and separator by the library's table-start rules. */
export function tableHeader(state: StateBlock, start: number, end: number) {
  if (start + 2 > end) return null
  const next = start + 1
  if (state.sCount[next] < state.blkIndent) return null
  if (state.sCount[next] - state.blkIndent >= 4) return null
  const separator = tableLine(state, next)
  if (separator.length < 2 || !/^[-:|][-:| \t]+$/u.test(separator)) return null
  if (/^-[ \t]/u.test(separator)) return null
  const parts = separator.split('|')
  const align: string[] = []
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index].trim()
    if (part === '' && (index === 0 || index === parts.length - 1)) continue
    if (!/^:?-+:?$/u.test(part)) return null
    align.push(
      part.endsWith(':')
        ? part.startsWith(':')
          ? 'center'
          : 'right'
        : part.startsWith(':')
          ? 'left'
          : '',
    )
  }
  const header = tableLine(state, start).trim()
  if (!header.includes('|') || state.sCount[start] - state.blkIndent >= 4)
    return null
  const columns = tableColumns(header)
  return columns.length > 0 && columns.length === align.length
    ? { columns, align }
    : null
}

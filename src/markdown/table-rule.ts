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
import type { StateBlock, Token } from 'markdown-it'
import { tableColumns, tableHeader, tableLine } from './table-source'

/** The library's per-table stop for the preview. It counts missing source cells. */
const maxAutocompletedCells = 65_536

/** Emits the given cells, up to the header width. */
function cells(
  state: StateBlock,
  columns: string[],
  align: string[],
  header: boolean,
): void {
  const tag = header ? 'th' : 'td'
  for (
    let index = 0;
    index < Math.min(columns.length, align.length);
    index += 1
  ) {
    const open = state.push(`${tag}_open`, tag, 1)
    if (align[index]) open.attrs = [['style', `text-align:${align[index]}`]]
    const inline = state.push('inline', '', 0)
    inline.content = columns[index].trim()
    inline.children = []
    state.push(`${tag}_close`, tag, -1)
  }
}

/** Records a missing-cell stop before later passes remove reference tokens. */
function stop(state: StateBlock, table: Token, line: number): void {
  table.meta = { ...table.meta, tableStopLine: line }
  if (typeof state.env.tableCellsLeft === 'number')
    state.env.tableTailLine = line
}

/** The library table rule with sparse rows and an optional file-wide budget. */
export function sparseTable(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  if (typeof state.env.tableTailLine === 'number') return false
  const header = tableHeader(state, startLine, endLine)
  if (!header) return false
  if (silent) return true
  const { columns, align } = header
  const oldParentType = state.parentType
  state.parentType = 'table'
  const terminators = state.md.block.ruler.getRules('blockquote')
  const table = state.push('table_open', 'table', 1)
  const tableLines: [number, number] = [startLine, 0]
  table.map = tableLines
  state.push('thead_open', 'thead', 1).map = [startLine, startLine + 1]
  state.push('tr_open', 'tr', 1).map = [startLine, startLine + 1]
  cells(state, columns, align, true)
  state.push('tr_close', 'tr', -1)
  state.push('thead_close', 'thead', -1)

  let bodyLines: [number, number] | undefined
  let autocompletedCells = 0
  let nextLine = startLine + 2
  for (; nextLine < endLine; nextLine += 1) {
    if (state.sCount[nextLine] < state.blkIndent) break
    if (terminators.some((rule) => rule(state, nextLine, endLine, true))) break
    const line = tableLine(state, nextLine).trim()
    if (line === '' || state.sCount[nextLine] - state.blkIndent >= 4) break
    const row = tableColumns(line)
    const left = state.env.tableCellsLeft
    if (typeof left === 'number') {
      // Keep the library's signed count: an overfull row reduces this count.
      autocompletedCells += align.length - row.length
      if (autocompletedCells > maxAutocompletedCells) {
        stop(state, table, nextLine)
        break
      }
      const missing = Math.max(0, align.length - row.length)
      if (missing > left) {
        stop(state, table, nextLine)
        break
      }
      state.env.tableCellsLeft = left - missing
    }
    if (!bodyLines) {
      bodyLines = [nextLine, 0]
      state.push('tbody_open', 'tbody', 1).map = bodyLines
    }
    state.push('tr_open', 'tr', 1).map = [nextLine, nextLine + 1]
    // Keep a row with no source cell visible.
    cells(state, row.length ? row : [''], align, false)
    state.push('tr_close', 'tr', -1)
  }
  if (bodyLines) {
    state.push('tbody_close', 'tbody', -1)
    bodyLines[1] = nextLine
  }
  state.push('table_close', 'table', -1)
  tableLines[1] = nextLine
  state.parentType = oldParentType
  state.line = nextLine
  return true
}

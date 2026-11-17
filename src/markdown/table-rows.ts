/**
 * The alignment of a column, from the colons of its separator cell. Null
 * keeps the text of the column at its start.
 */
export type CellAlign = 'left' | 'center' | 'right' | null

/** The cells of a Markdown table, row by row, and how each column aligns. */
export interface TableCells<Cell> {
  /** The header row. Its cells set the columns of the table. */
  head: readonly Cell[]
  /** The body rows, each with the cells that it has. */
  rows: readonly (readonly Cell[])[]
  /** The alignment of each column. */
  align: readonly CellAlign[]
}

/** The cells of one table row. A `\|` stays a pipe inside a cell. */
export function readTableRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index]
    if (char === '\\' && row[index + 1] === '|') {
      cell += '|'
      index += 1
    } else if (char === '|') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell.trim())
  return cells
}

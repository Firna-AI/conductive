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

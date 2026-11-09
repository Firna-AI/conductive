import type { CSSProperties, ReactNode } from 'react'
import { classes } from './classes'
import type { CellAlign, TableCells } from './tableCells'
import styles from './MarkdownTable.module.css'

/** The most columns that one cell can span. HTML reads a larger span as it. */
const maxSpan = 1000

const alignStyles: Readonly<Record<NonNullable<CellAlign>, CSSProperties>> = {
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
}

function alignStyle(align: CellAlign | undefined): CSSProperties | undefined {
  return align ? alignStyles[align] : undefined
}

/**
 * One body row. Cells past the width of the header do not show. The last
 * cell of a short row spans the missing columns, up to the most that HTML
 * allows, and any columns after that stay empty. A cell that spans keeps
 * its text at its start, so the text never stands under a column that it
 * does not belong to.
 */
function BodyRow<Cell>(props: {
  cells: readonly Cell[]
  columns: number
  align: readonly CellAlign[]
  renderCell: (cell: Cell) => ReactNode
}) {
  const { cells, columns } = props
  const shown = cells.length > columns ? cells.slice(0, columns) : cells
  return (
    <tr>
      {shown.map((cell, column) => {
        const last = column === shown.length - 1
        const span = last ? Math.min(maxSpan, columns - column) : 1
        return (
          <td
            colSpan={span > 1 ? span : undefined}
            key={column}
            style={span > 1 ? undefined : alignStyle(props.align[column])}
          >
            {props.renderCell(cell)}
          </td>
        )
      })}
    </tr>
  )
}

/**
 * A Markdown table as a native table, in the look that the replies of the
 * chat and the file preview share. Each caller draws the content of its
 * cells. A table wider than its place scrolls sideways inside its box, so
 * the text around it keeps its width. `className` places the box, such as
 * with a margin.
 */
export function MarkdownTable<Cell>(
  props: TableCells<Cell> & {
    renderCell: (cell: Cell) => ReactNode
    className?: string
  },
) {
  const { head, rows, align, renderCell } = props
  return (
    <div className={classes(styles.table, props.className)}>
      <table>
        <thead>
          <tr>
            {head.map((cell, column) => (
              <th key={column} style={alignStyle(align[column])}>
                {renderCell(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <BodyRow
              align={align}
              cells={cells}
              columns={head.length}
              key={index}
              renderCell={renderCell}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

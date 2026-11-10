import type { Viewport } from '@mokly/mokly'
import {
  parityAreas,
  type ParityArea,
} from '../../../../../src/marketing/from-conductor/areas'
import { parityPageCopy } from '../../../../../src/marketing/from-conductor/copy'
import { featuresOf } from '../../../../../src/marketing/from-conductor/features'
import { classes } from '../common/classes'
import { FeatureCells } from './FeatureCells'
import { ParityLegend } from './ParityLegend'
import rows from './parityRows.module.css'
import styles from './ParityOneTable.module.css'

/**
 * The rows of one area: a row group with a row for each feature. The first
 * row holds the area as one header cell that spans the rows of the group,
 * and each row also holds the area in a row header of its own. A computer shows
 * the merged cell, so no line crosses it until the darker hairline at the
 * end of the area. A phone stacks each row and shows its own area cell.
 * CSS alone chooses, so one table serves both layouts without a script.
 * Each row has the id of its feature as its address, such as `#file-tree`.
 */
function AreaRows(props: { area: ParityArea }) {
  const { area } = props
  const features = featuresOf(area.key)
  return (
    <tbody>
      {features.map((feature, index) => (
        <tr
          className={classes(
            rows.row,
            index === 0 && styles.groupStart,
            index === features.length - 1 && styles.groupEnd,
          )}
          id={feature.id}
          key={feature.id}
        >
          {index === 0 ? (
            <th
              className={classes(styles.area, styles.groupArea)}
              rowSpan={features.length}
              scope="rowgroup"
            >
              {area.title}
            </th>
          ) : null}
          <th className={classes(styles.area, styles.rowArea)} scope="row">
            {area.title}
          </th>
          <FeatureCells feature={feature} />
        </tr>
      ))}
    </tbody>
  )
}

/**
 * The list as one table: the legend, then one header and a group of rows
 * for each area, in the order of the areas, with a row for each Conductor
 * Cloud feature. The first column names the area of each group, and the
 * cells of each feature keep their hairlines.
 */
export function ParityOneTable(props: { viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  const columns = parityPageCopy.columns
  return (
    <div
      className={classes(
        styles.layout,
        mobile && styles.mobile,
        mobile && rows.mobile,
      )}
    >
      <ParityLegend viewport={props.viewport} />
      <table className={rows.table}>
        <thead className={classes(rows.head, styles.columns)}>
          <tr>
            <th scope="col">{columns.area}</th>
            <th scope="col">{columns.feature}</th>
            <th scope="col">{columns.status}</th>
            <th scope="col">{columns.note}</th>
          </tr>
        </thead>
        {parityAreas.map((area) => (
          <AreaRows area={area} key={area.key} />
        ))}
      </table>
    </div>
  )
}

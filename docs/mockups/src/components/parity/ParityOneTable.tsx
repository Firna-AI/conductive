import type { Viewport } from '@mokly/mokly'
import { productName } from '../../brand'
import { parityAreas, type ParityArea } from '../../fixtures/conductorParity'
import { classes } from '../common/classes'
import { FeatureCells } from './FeatureCells'
import { ParityLegend } from './ParityLegend'
import { featuresOf } from './parityStatus'
import rows from './parityRows.module.css'
import styles from './ParityOneTable.module.css'

/**
 * The rows of one area: a row group with a row for each feature. On a
 * computer, the first row holds the area as one header cell that spans the
 * rows of the group, so no line crosses it until the darker hairline at the
 * end of the area. A phone stacks each row, so each row names its area in a
 * cell of its own.
 */
function AreaRows(props: { area: ParityArea; mobile: boolean }) {
  const { area, mobile } = props
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
          key={feature.name}
        >
          {mobile ? <td className={styles.area}>{area.title}</td> : null}
          {!mobile && index === 0 ? (
            <th
              className={styles.area}
              rowSpan={features.length}
              scope="rowgroup"
            >
              {area.title}
            </th>
          ) : null}
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
            <th scope="col">Area</th>
            <th scope="col">Conductor Cloud feature</th>
            <th scope="col">In {productName}</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        {parityAreas.map((area) => (
          <AreaRows area={area} key={area.key} mobile={mobile} />
        ))}
      </table>
    </div>
  )
}

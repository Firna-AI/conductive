import type { Viewport } from '@mokly/mokly'
import { productName } from '../../brand'
import { parityAreas } from '../../fixtures/conductorParity'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { FeatureCells } from './FeatureCells'
import { ParityLegend } from './ParityLegend'
import { featuresOf } from './parityStatus'
import rows from './parityRows.module.css'
import styles from './ParityOneTable.module.css'

/**
 * The list as one table: the legend, then one header and a row for each
 * Conductor Cloud feature, in the order of the areas. The first column
 * names the area. A computer shows the name on the first row of each area,
 * and a darker hairline ends each area. A screen reader still reads the area
 * of each row. A phone stacks each row, with its area on top.
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
        <tbody>
          {parityAreas.flatMap((area) => {
            const features = featuresOf(area.key)
            return features.map((feature, index) => {
              const first = index === 0
              return (
                <tr
                  className={classes(
                    rows.row,
                    first && styles.groupStart,
                    index === features.length - 1 && styles.groupEnd,
                  )}
                  key={feature.name}
                >
                  <td className={styles.area}>
                    <span className={first || mobile ? undefined : a11y.hidden}>
                      {area.title}
                    </span>
                  </td>
                  <FeatureCells feature={feature} />
                </tr>
              )
            })
          })}
        </tbody>
      </table>
    </div>
  )
}

import type { Viewport } from '@mokly/mokly'
import { productName } from '../../brand'
import { parityAreas } from '../../fixtures/conductorParity'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { FeatureCells } from './FeatureCells'
import { ParityLegend } from './ParityLegend'
import { featuresOf } from './parityStatus'
import rows from './parityRows.module.css'
import styles from './ParityTable.module.css'

/**
 * The list by area: an index of the areas, the legend, then one table for
 * each area, with a row for each Conductor Cloud feature. A visitor looks
 * up one feature. On a phone each row stacks its cells.
 */
export function ParityTable(props: { page: string; viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  return (
    <div
      className={classes(
        styles.layout,
        mobile && styles.mobile,
        mobile && rows.mobile,
      )}
    >
      <nav aria-label="Areas" className={styles.index}>
        <span className={styles.indexLabel}>Areas</span>
        <ul className={styles.indexList}>
          {parityAreas.map((area) => (
            <li key={area.key}>
              <ScreenLink
                className={styles.indexLink}
                fragment={area.key}
                to={props.page}
              >
                {area.title}
              </ScreenLink>
            </li>
          ))}
        </ul>
      </nav>
      <ParityLegend viewport={props.viewport} />
      {parityAreas.map((area) => (
        <section
          aria-labelledby={`${area.key}-title`}
          className={styles.area}
          id={area.key}
          key={area.key}
        >
          <h2 className={styles.areaTitle} id={`${area.key}-title`}>
            {area.title}
          </h2>
          <table className={rows.table}>
            <thead className={classes(rows.head, styles.columns)}>
              <tr>
                <th scope="col">Conductor Cloud</th>
                <th scope="col">In {productName}</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {featuresOf(area.key).map((feature) => (
                <tr className={rows.row} key={feature.name}>
                  <FeatureCells feature={feature} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}

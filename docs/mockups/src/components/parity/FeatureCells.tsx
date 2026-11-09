import type { ParityFeature } from '../../fixtures/conductorParity'
import { DueDay, StatusMark } from './ParityMarks'
import rows from './parityRows.module.css'

/**
 * The cells of one feature in a table of features: its name as the header
 * of the row, its status with its due day, and its note. The area layout
 * and the one-table layout share them.
 */
export function FeatureCells(props: { feature: ParityFeature }) {
  const { feature } = props
  return (
    <>
      <th className={rows.name} scope="row">
        {feature.name}
      </th>
      <td className={rows.status}>
        <StatusMark status={feature.status} />
        <DueDay feature={feature} />
      </td>
      <td className={rows.note}>{feature.note}</td>
    </>
  )
}

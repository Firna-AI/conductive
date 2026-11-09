import {
  isComing,
  type ParityFeature,
} from '../../../../../src/marketing/from-conductor/model'
import { DueDay, StatusMark } from './ParityMarks'
import rows from './parityRows.module.css'

/**
 * The cells of one feature in the table of features: its name as the header
 * of the row, its status with its due day when it is on the way, and its
 * note.
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
        {isComing(feature) ? <DueDay feature={feature} /> : null}
      </td>
      <td className={rows.note}>{feature.note}</td>
    </>
  )
}

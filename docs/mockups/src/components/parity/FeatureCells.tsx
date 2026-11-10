import { rowLinkLabel } from '../../../../../src/marketing/from-conductor/copy'
import {
  isComing,
  type ParityFeature,
} from '../../../../../src/marketing/from-conductor/model'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { siteIcons } from '../marketing/siteIcons'
import { DueDay, StatusMark } from './ParityMarks'
import rows from './parityRows.module.css'

const LinkIcon = siteIcons.link

/**
 * The cells of one feature in the table of features: its name as the header
 * of the row, with the link to the address of its row, its status with its
 * due day when it is on the way, and its note. The header keeps the name as
 * its only accessible name, because it names each cell of the row.
 */
export function FeatureCells(props: { feature: ParityFeature }) {
  const { feature } = props
  return (
    <>
      <th aria-label={feature.name} className={rows.name} scope="row">
        {feature.name}
        <RowLink feature={feature} />
      </th>
      <td className={rows.status}>
        <StatusMark status={feature.status} />
        {isComing(feature) ? <DueDay feature={feature} /> : null}
      </td>
      <td className={rows.note}>{feature.note}</td>
    </>
  )
}

/**
 * The quiet link icon after the name, which leads to the address of the row.
 * The span keeps the icon on the line of the last word of the name.
 */
function RowLink(props: { feature: ParityFeature }) {
  const { feature } = props
  return (
    <span className={rows.nameEnd}>
      {'\u00a0'}
      <ScreenLink
        aria-label={rowLinkLabel(feature.name)}
        className={rows.link}
        fragment={feature.id}
        to={paths.fromConductor}
      >
        <LinkIcon aria-hidden size={14} />
      </ScreenLink>
    </span>
  )
}

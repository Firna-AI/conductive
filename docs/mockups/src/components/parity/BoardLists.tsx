import type { ParityFeature } from '../../fixtures/conductorParity'
import { classes } from '../common/classes'
import { StatusMark } from './ParityMarks'
import {
  areaTitle,
  comingFeatures,
  dayWords,
  featuresWith,
  parityStatuses,
} from './parityStatus'
import styles from './BoardLists.module.css'

/** The area of a feature, as a small label in capitals. */
function AreaLabel(props: { feature: ParityFeature }) {
  return <span className={styles.area}>{areaTitle(props.feature.area)}</span>
}

/** The features that work today, in a grid of two columns on a computer. */
export function AvailableList(props: {
  features: readonly ParityFeature[]
  mobile: boolean
}) {
  const Icon = parityStatuses.available.icon
  return (
    <ul className={classes(styles.grid, props.mobile && styles.single)}>
      {props.features.map((feature) => (
        <li className={styles.item} key={feature.name}>
          <AreaLabel feature={feature} />
          <span className={styles.name}>
            <Icon aria-hidden className={styles.check} size={15} />
            {feature.name}
          </span>
          <p className={styles.note}>{feature.note}</p>
        </li>
      ))}
    </ul>
  )
}

/**
 * The due day of a feature on the way, as a leaf of a calendar. A feature
 * without a due day shows a dashed leaf that says so.
 */
function DayLeaf(props: { due: string | null }) {
  if (props.due === null) {
    return (
      <span className={classes(styles.leaf, styles.undated)}>No date yet</span>
    )
  }
  const [day, ...monthAndYear] = dayWords(props.due, 'short').split(' ')
  return (
    <time className={styles.leaf} dateTime={props.due}>
      <span className={styles.leafLabel}>Due</span>
      <span className={styles.leafDay}>{day}</span>
      <span className={styles.leafLabel}>{monthAndYear.join(' ')}</span>
    </time>
  )
}

/**
 * The features on the way: those with a due day first, the soonest first,
 * then those without one. Each shows its status beside its name, so the
 * status and the due day read apart.
 */
export function ComingList(props: { mobile: boolean }) {
  return (
    <ol className={classes(styles.coming, props.mobile && styles.single)}>
      {comingFeatures().map((feature) => (
        <li className={styles.comingRow} key={feature.name}>
          <DayLeaf due={feature.due} />
          <div className={styles.what}>
            <div className={styles.comingHead}>
              <span className={styles.name}>{feature.name}</span>
              <StatusMark status={feature.status} />
            </div>
            <p className={styles.note}>{feature.note}</p>
            <AreaLabel feature={feature} />
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * Features with a note each: the name and the area beside the note on a
 * computer, and above it on a phone.
 */
export function NoteList(props: {
  features: readonly ParityFeature[]
  mobile: boolean
}) {
  return (
    <ul className={classes(styles.notes, props.mobile && styles.single)}>
      {props.features.map((feature) => (
        <li className={styles.noteRow} key={feature.name}>
          <div className={styles.noteHead}>
            <span className={styles.name}>{feature.name}</span>
            <AreaLabel feature={feature} />
          </div>
          <p className={styles.note}>{feature.note}</p>
        </li>
      ))}
    </ul>
  )
}

/**
 * The missing features in two lists: those under consideration, then those
 * left out by design. Each list starts with its status and what it means.
 */
export function MissingLists(props: { mobile: boolean }) {
  const statuses = ['considering', 'not-planned'] as const
  return (
    <div className={styles.missing}>
      {statuses.map((status) => (
        <div className={styles.subgroup} key={status}>
          <div className={styles.subHead}>
            <h3 className={styles.subTitle}>
              <StatusMark status={status} />
            </h3>
            <p className={styles.subText}>{parityStatuses[status].meaning}</p>
          </div>
          <NoteList features={featuresWith([status])} mobile={props.mobile} />
        </div>
      ))}
    </div>
  )
}

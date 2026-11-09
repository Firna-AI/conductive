import type { Viewport } from '@mokly/mokly'
import {
  ChevronDown,
  Cloud,
  GitPullRequest,
  MessagesSquare,
  SquarePlus,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import {
  parityAreas,
  type ParityArea,
  type ParityAreaKey,
} from '../../fixtures/conductorParity'
import { classes } from '../common/classes'
import { DueDay, StatusMark } from './ParityMarks'
import { ParityLegend } from './ParityLegend'
import {
  featuresOf,
  isComing,
  parityStatuses,
  statusCounts,
} from './parityStatus'
import styles from './ParityGuide.module.css'

/** The icon of each task of the guide. */
const icons: Readonly<Record<ParityAreaKey, LucideIcon>> = {
  workspaces: SquarePlus,
  agents: MessagesSquare,
  review: GitPullRequest,
  computer: Cloud,
  teams: Users,
  automation: Workflow,
}

/**
 * One task of the guide: what it means after a move, the count of each
 * status, what is on the way, and every feature behind a disclosure, which
 * opens without a script.
 */
function TaskCard(props: { area: ParityArea; open: boolean }) {
  const { area } = props
  const features = featuresOf(area.key)
  const coming = features.filter(isComing)
  const Icon = icons[area.key]
  const counts = statusCounts(features)
  return (
    <section
      aria-labelledby={`${area.key}-title`}
      className={styles.task}
      id={area.key}
    >
      <div className={styles.head}>
        <h2 className={styles.title} id={`${area.key}-title`}>
          <Icon aria-hidden className={styles.icon} size={18} />
          {area.task}
        </h2>
        <p className={styles.summary}>{area.summary}</p>
        <p className={styles.counts}>
          {counts.map(({ status, count }, index) => (
            <span className={styles.count} key={status}>
              {index > 0 ? '· ' : null}
              {parityStatuses[status].counted(count)}
            </span>
          ))}
        </p>
      </div>
      {coming.length > 0 ? (
        <ul aria-label="On the way" className={styles.coming}>
          {coming.map((feature) => (
            <li className={styles.comingItem} key={feature.name}>
              <span className={styles.name}>{feature.name}</span>
              <StatusMark status={feature.status} />
              <DueDay feature={feature} />
            </li>
          ))}
        </ul>
      ) : null}
      <details className={styles.details} open={props.open}>
        <summary className={styles.toggle}>
          {`The ${features.length} features`}
          <ChevronDown aria-hidden className={styles.chevron} size={16} />
        </summary>
        <ul className={styles.list}>
          {features.map((feature) => (
            <li className={styles.row} key={feature.name}>
              <div className={styles.rowHead}>
                <span className={styles.name}>{feature.name}</span>
                <StatusMark status={feature.status} />
                <DueDay feature={feature} />
              </div>
              <p className={styles.note}>{feature.note}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

/**
 * The list by task: a card for each job that a Conductor Cloud user does.
 * Each card answers first in one sentence, and lists its features only when
 * it opens. Every card starts closed, and the legend comes last. `open`
 * names the card that a visitor opened, for the saved state.
 */
export function ParityGuide(props: {
  open: ParityAreaKey | 'none'
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <div className={classes(styles.layout, mobile && styles.mobile)}>
      {parityAreas.map((area) => (
        <TaskCard area={area} key={area.key} open={area.key === props.open} />
      ))}
      <ParityLegend viewport={props.viewport} />
    </div>
  )
}

import type { Viewport } from '@mokly/mokly'
import { productName } from '../../brand'
import type { ParityStatus } from '../../fixtures/conductorParity'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { AvailableList, ComingList, MissingLists, NoteList } from './BoardLists'
import { dueRule, featuresWith } from './parityStatus'
import styles from './ParityBoard.module.css'

/** A section of the board: the statuses that it holds, and its words. */
type BoardGroup = {
  /** The anchor of the section, which its tile links to. */
  id: 'available' | 'on-the-way' | 'different' | 'not-available'
  label: string
  title: string
  text: string
  statuses: readonly ParityStatus[]
}

/** The sections of the board, from what works today to what is missing. */
const groups: readonly BoardGroup[] = [
  {
    id: 'available',
    label: 'Available',
    title: 'Ready when you move.',
    text: `These Conductor Cloud features work in ${productName} today.`,
    statuses: ['available'],
  },
  {
    id: 'on-the-way',
    label: 'On the way',
    title: 'Being built, or planned.',
    text: dueRule,
    statuses: ['in-progress', 'planned'],
  },
  {
    id: 'different',
    label: 'Works differently',
    title: 'The same need, met another way.',
    text: `${productName} does these jobs with its own design.`,
    statuses: ['different'],
  },
  {
    id: 'not-available',
    label: 'Not available',
    title: 'What to do instead.',
    text: `Each feature says what you can do in ${productName} today.`,
    statuses: ['considering', 'not-planned'],
  },
]

/** The list of one section, in the shape that its statuses need. */
function GroupList(props: { group: BoardGroup; mobile: boolean }) {
  const { group, mobile } = props
  if (group.id === 'available') {
    return (
      <AvailableList features={featuresWith(group.statuses)} mobile={mobile} />
    )
  }
  if (group.id === 'on-the-way') return <ComingList mobile={mobile} />
  if (group.id === 'different') {
    return <NoteList features={featuresWith(group.statuses)} mobile={mobile} />
  }
  return <MissingLists mobile={mobile} />
}

/**
 * The list by status: a count for each section at the top, then what works
 * today, what is on the way with its due day, what works differently, and
 * what to do in place of each missing feature.
 */
export function ParityBoard(props: { page: string; viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  return (
    <div className={classes(styles.layout, mobile && styles.mobile)}>
      <nav aria-label="Sections" className={styles.tiles}>
        {groups.map((group) => (
          <ScreenLink
            className={styles.tile}
            fragment={group.id}
            key={group.id}
            to={props.page}
          >
            <span className={styles.count}>
              {featuresWith(group.statuses).length}
            </span>
            <span className={styles.tileLabel}>{group.label}</span>
          </ScreenLink>
        ))}
      </nav>
      {groups.map((group) => (
        <section
          aria-labelledby={`${group.id}-title`}
          className={styles.group}
          id={group.id}
          key={group.id}
        >
          <div className={styles.intro}>
            <span className={styles.label}>{group.label}</span>
            <h2 className={styles.title} id={`${group.id}-title`}>
              {group.title}
            </h2>
            <p className={styles.text}>{group.text}</p>
          </div>
          <GroupList group={group} mobile={mobile} />
        </section>
      ))}
    </div>
  )
}

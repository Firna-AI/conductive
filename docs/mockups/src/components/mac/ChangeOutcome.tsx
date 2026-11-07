import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { classes } from '../common/classes'
import styles from './ChangeOutcome.module.css'

/** Done and saved, done but not saved, or not done. */
export type ChangeStatus = 'done' | 'done-not-saved' | 'failed'

const icons = {
  done: CircleCheck,
  'done-not-saved': TriangleAlert,
  failed: CircleAlert,
} as const

const tones = {
  done: styles.done,
  'done-not-saved': styles.notSaved,
  failed: styles.failed,
} as const

/**
 * What became of one change of the Mac's settings, such as Remove of an
 * always-allowed command: its result in a few words, what it acted on, and
 * the cause that the Mac gave. It stays until the next change of the same
 * control, so a change that the Mac did not save or did not make never goes
 * unseen. When the change took its control away, such as the row of a
 * removed command, `action` repeats it.
 */
export function ChangeOutcome(props: {
  status: ChangeStatus
  title: string
  /** What the change acted on: an exact command, or a workspace name. */
  subject: ReactNode
  /** The subject is a command, which shows in the code font. */
  code?: boolean
  message?: string | null
  /** The control that repeats the change, when no other control can. */
  action?: ReactNode
}) {
  const Icon = icons[props.status]
  return (
    <div className={classes(styles.outcome, tones[props.status])}>
      <Icon aria-hidden className={styles.icon} size={14} />
      <div
        className={styles.text}
        role={props.status === 'done' ? 'status' : 'alert'}
      >
        <span className={styles.head}>
          <span className={styles.title}>{props.title}</span>{' '}
          <span className={props.code ? styles.code : styles.subject}>
            {props.subject}
          </span>
        </span>
        {props.message ? (
          <>
            {' '}
            <span className={styles.message}>{props.message}</span>
          </>
        ) : null}
      </div>
      {props.action}
    </div>
  )
}

import type { Viewport } from '@mokly/mokly'
import { Cloud } from 'lucide-react'
import { productName } from '../../brand'
import {
  conductorCloudDays,
  parityCheckedOn,
} from '../../fixtures/conductorParity'
import { classes } from '../common/classes'
import { dayWords } from './parityStatus'
import styles from './ParityIntro.module.css'

/** A day of the page as a `time` element, such as "13 November 2026". */
function Day(props: { day: string }) {
  return <time dateTime={props.day}>{dayWords(props.day, 'long')}</time>
}

/**
 * The top of the page for people who move from Conductor Cloud: the title,
 * one sentence, the note that the list covers Conductor Cloud only, and the
 * days that matter for a move. Every layout of the page starts with it.
 */
export function ParityIntro(props: { viewport: Viewport }) {
  return (
    <header
      className={classes(
        styles.intro,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <span className={styles.label}>From Conductor Cloud</span>
      <h1 className={styles.title}>Coming from Conductor Cloud?</h1>
      <p className={styles.lead}>
        See which Conductor Cloud features work in {productName} today, which
        are on the way, and which work differently.
      </p>
      <div className={styles.scope} role="note">
        <Cloud aria-hidden className={styles.scopeIcon} size={16} />
        <p className={styles.scopeText}>
          <strong className={styles.scopeTitle}>
            Conductor Cloud features only.
          </strong>{' '}
          The list leaves out the features of local Conductor workspaces on a
          Mac.
        </p>
      </div>
      <p className={styles.facts}>
        Conductor Cloud turns read-only on{' '}
        <Day day={conductorCloudDays.readOnly} /> and shuts down on{' '}
        <Day day={conductorCloudDays.shutDown} />. Checked on{' '}
        <Day day={parityCheckedOn} />.
      </p>
    </header>
  )
}

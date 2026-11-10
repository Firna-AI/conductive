import type { Viewport } from '@mokly/mokly'
import { parityPageCopy } from '../../../../../src/marketing/from-conductor/copy'
import { timeWords } from '../../../../../src/marketing/from-conductor/dates'
import { classes } from '../common/classes'
import { ParityCopyText } from './ParityCopyText'
import styles from './ParityIntro.module.css'

/**
 * The top of the page for people who move from Conductor: the title, one
 * sentence, the days of the cloud workspaces of Conductor with its
 * announcement, and, on its own line, the time in UTC of the last check of
 * the list.
 */
export function ParityIntro(props: { viewport: Viewport }) {
  const copy = parityPageCopy
  const { lastCheck } = copy
  return (
    <header
      className={classes(
        styles.intro,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <span className={styles.label}>{copy.label}</span>
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.lead}>{copy.lead}</p>
      <p className={styles.facts}>
        <ParityCopyText linkClassName={styles.link} text={copy.cloudDays} />
      </p>
      <p className={styles.facts}>
        {lastCheck.label}{' '}
        <time dateTime={lastCheck.time}>{timeWords(lastCheck.time)}</time>
      </p>
    </header>
  )
}

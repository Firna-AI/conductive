import type { Viewport } from '@mokly/mokly'
import { Cloud } from 'lucide-react'
import { parityPageCopy } from '../../../../../src/marketing/from-conductor/copy'
import { classes } from '../common/classes'
import { ParityCopyText } from './ParityCopyText'
import styles from './ParityIntro.module.css'

/**
 * The top of the page for people who move from Conductor Cloud: the title,
 * one sentence, the note that the list covers Conductor Cloud only, the
 * days of Conductor Cloud with its announcement, and the day of the last
 * check of the list.
 */
export function ParityIntro(props: { viewport: Viewport }) {
  const copy = parityPageCopy
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
      <div className={styles.scope} role="note">
        <Cloud aria-hidden className={styles.scopeIcon} size={16} />
        <p className={styles.scopeText}>
          <strong className={styles.scopeTitle}>{copy.scope.title}</strong>{' '}
          {copy.scope.text}
        </p>
      </div>
      <p className={styles.facts}>
        <ParityCopyText linkClassName={styles.link} text={copy.cloudDays} />{' '}
        <ParityCopyText linkClassName={styles.link} text={copy.checked} />
      </p>
    </header>
  )
}

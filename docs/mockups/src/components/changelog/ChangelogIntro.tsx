import type { Viewport } from '@mokly/mokly'
import { changelogPageCopy } from '../../../../../src/marketing/changelog-copy'
import { classes } from '../common/classes'
import { ParityCopyText } from '../parity/ParityCopyText'
import styles from './ChangelogIntro.module.css'

/**
 * The top of the changelog page: the label, the title, and one sentence
 * that links the releases on GitHub for the complete list of changes.
 */
export function ChangelogIntro(props: { viewport: Viewport }) {
  const copy = changelogPageCopy
  return (
    <header
      className={classes(
        styles.intro,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <span className={styles.label}>{copy.label}</span>
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.lead}>
        <ParityCopyText linkClassName={styles.link} text={copy.lead} />
      </p>
    </header>
  )
}

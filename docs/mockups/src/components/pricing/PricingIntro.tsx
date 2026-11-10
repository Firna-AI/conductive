import type { Viewport } from '@mokly/mokly'
import { pricingPageCopy } from '../../../../../src/marketing/pricing'
import { classes } from '../common/classes'
import { siteIcons } from '../marketing/siteIcons'
import styles from './PricingIntro.module.css'

const NoteIcon = siteIcons['calendar-check']

/**
 * The top of the pricing page: the label, the title, one sentence, and the
 * note that the product stays free until billing starts, with no date.
 */
export function PricingIntro(props: { viewport: Viewport }) {
  const copy = pricingPageCopy
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
      <div className={styles.note} role="note">
        <NoteIcon aria-hidden className={styles.noteIcon} size={16} />
        <p className={styles.noteText}>
          <strong className={styles.noteTitle}>{copy.free.title}</strong>{' '}
          {copy.free.text}
        </p>
      </div>
    </header>
  )
}

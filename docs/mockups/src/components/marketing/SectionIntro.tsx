import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { classes } from '../../../../../src/ui/components/common/classes'
import styles from './SectionIntro.module.css'

/**
 * The start of a section of the site: a short label in capitals, a
 * headline, and one supporting sentence.
 */
export function SectionIntro(props: {
  label: string
  title: string
  text: string
  viewport: Viewport
  centred?: boolean
}) {
  return (
    <div
      className={classes(
        styles.intro,
        props.viewport === 'mobile' && styles.mobile,
        props.centred && styles.centred,
      )}
    >
      <span className={styles.label}>{props.label}</span>
      <h2 className={styles.title}>{props.title}</h2>
      <p className={styles.text}>{props.text}</p>
    </div>
  )
}

import { Layers } from 'lucide-react'
import styles from './Mark.module.css'

/** The mark of the app: a neutral glyph, with no product name. */
export function Mark() {
  return (
    <span aria-hidden className={styles.mark}>
      <Layers size={13} strokeWidth={2.25} />
    </span>
  )
}

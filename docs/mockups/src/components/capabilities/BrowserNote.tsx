import { Laptop } from 'lucide-react'
import { thisMacWords } from './capabilitiesCopy'
import styles from './BrowserNote.module.css'

/**
 * The note of a browser in place of the line of this Mac, from Mac access
 * decision 5 A. Mac access decision 7 removes it, because a browser shows
 * no Mac access part. No mockup draws it. The app draws it until it hides
 * the part in a browser.
 */
export function BrowserNote() {
  return (
    <p className={styles.note}>
      <Laptop aria-hidden className={styles.noteIcon} size={14} />
      <span>{thisMacWords.browserNote}</span>
    </p>
  )
}

import { Laptop } from 'lucide-react'
import { thisMacWords } from './capabilitiesCopy'
import styles from './Capabilities.module.css'

/**
 * The note of a browser in place of the line of this Mac, while Mac access
 * is on (Mac access decision 5 A). Only the page of the Mac app can start a
 * grant, so the note names its line. Without it, the Mac asks at the first
 * command. The app and the mockups draw it from here.
 */
export function BrowserNote() {
  return (
    <p className={styles.note}>
      <Laptop aria-hidden className={styles.noteIcon} size={14} />
      <span>{thisMacWords.browserNote}</span>
    </p>
  )
}

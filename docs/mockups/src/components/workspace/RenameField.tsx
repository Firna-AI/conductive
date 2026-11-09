import { MessageSquare } from 'lucide-react'
import { classes } from '../common/classes'
import styles from './WorkspaceTabs.module.css'

/**
 * The title of a session as a field, in place of its tab label. The field
 * opens focused, with the title selected, so typing replaces the title.
 * Enter or leaving the field saves the name, and Escape keeps the old one.
 * A view runs no script, so it draws the focus and the selection.
 */
export function RenameField(props: { title: string }) {
  return (
    <form className={styles.link}>
      <MessageSquare aria-hidden className={styles.icon} size={13} />
      <span
        aria-label="Session name"
        className={classes(styles.rename, styles.renameFocused)}
        role="textbox"
      >
        <span className={styles.renameSelection}>{props.title}</span>
      </span>
    </form>
  )
}

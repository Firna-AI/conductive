import { useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import tabRename from '../../../docs/mockups/src/components/workspace/TabRename.module.css'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'

/**
 * The title of a session as a field, in place of the label of its tab, in
 * the look of the rename field of the mockups. The field opens focused, with
 * the title selected, so typing replaces the title. Enter or leaving the
 * field saves the name, and Escape keeps the old one.
 */
export function RenameField(props: {
  title: string
  onSave: (title: string) => void
  onCancel: () => void
}) {
  const done = useRef(false)
  const finish = (save: boolean, value: string) => {
    if (done.current) return
    done.current = true
    if (save) props.onSave(value)
    else props.onCancel()
  }
  return (
    <form
      className={styles.link}
      onSubmit={(event) => {
        event.preventDefault()
        finish(
          true,
          new FormData(event.currentTarget).get('title')?.toString() ?? '',
        )
      }}
    >
      <MessageSquare aria-hidden className={styles.icon} size={13} />
      <input
        aria-label="Session name"
        autoFocus
        className={tabRename.rename}
        defaultValue={props.title}
        name="title"
        onBlur={(event) => finish(true, event.currentTarget.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          finish(false, '')
        }}
      />
    </form>
  )
}

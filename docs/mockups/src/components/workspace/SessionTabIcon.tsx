import { Spinner } from '@firna/ui/spinner'
import { MessageSquare } from 'lucide-react'
import styles from './WorkspaceTabs.module.css'

export function SessionTabIcon(props: { running: boolean }) {
  return props.running ? (
    <span className={styles.icon}>
      <Spinner accessibilityLabel="Working" color="var(--ui-muted)" size={13} />
    </span>
  ) : (
    <MessageSquare aria-hidden className={styles.icon} size={13} />
  )
}

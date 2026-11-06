import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from './StatusText.module.css'

export type StatusTone = 'neutral' | 'active' | 'success' | 'danger' | 'muted'

/**
 * A state as a small glyph and a word, so that the state never depends on
 * colour alone: a spinner while busy, an icon, or a dot.
 */
export function StatusText(props: {
  label: string
  tone: StatusTone
  busy?: boolean
  icon?: LucideIcon
}) {
  const theme = useSharedUiTheme()
  const Icon = props.icon
  let glyph = <span aria-hidden className={styles.dot} />
  if (props.busy) {
    const color =
      props.tone === 'active' ? theme.colors.primary : theme.colors.muted
    glyph = <Spinner color={color} size={11} />
  } else if (Icon) {
    glyph = <Icon aria-hidden className={styles.icon} size={13} />
  }
  return (
    <span className={`${styles.status} ${styles[props.tone]}`}>
      {glyph}
      {props.label}
    </span>
  )
}

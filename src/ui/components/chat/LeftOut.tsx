import { Scissors } from 'lucide-react'
import styles from './ToolGroup.module.css'

/**
 * The output that the runner left out of a tool's detail: scissors and a
 * short text, such as "1.2 MB left out".
 */
export function LeftOut(props: { text: string }) {
  return (
    <span className={styles.leftOut}>
      <Scissors aria-hidden size={12} />
      {props.text}
    </span>
  )
}

import { SquareDot, SquareMinus, SquarePlus } from 'lucide-react'
import { changeLabels, type ChangeKind } from '../../fixtures/files'
import styles from './ChangeIcon.module.css'

const icons = {
  added: SquarePlus,
  modified: SquareDot,
  deleted: SquareMinus,
} as const

/** A small square that marks a file as added, modified, or deleted. */
export function ChangeIcon(props: { change: ChangeKind }) {
  const Icon = icons[props.change]
  return (
    <Icon
      aria-hidden={false}
      aria-label={changeLabels[props.change]}
      className={styles[props.change]}
      role="img"
      size={13}
    />
  )
}

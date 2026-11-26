import { Switch } from '@firna/ui/switch'
import { Lock } from 'lucide-react'
import { StatusText } from '../common/StatusText'
import { useControlSizes } from '../common/touch'
import styles from './EnvironmentSections.module.css'

/**
 * The Secret mark of a variable as a switch with its visible label. `label`
 * names the switch, such as "Secret value of DATABASE_URL", so the visible
 * word is hidden from assistive technology.
 */
export function SecretSwitch(props: {
  label: string
  value: boolean
  onValueChange?: (value: boolean) => void
  disabled?: boolean
}) {
  const { field } = useControlSizes()
  return (
    <span className={styles.secret}>
      <Switch
        accessibilityLabel={props.label}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
        size={field === 'lg' ? 'md' : 'sm'}
        value={props.value}
      />
      <span aria-hidden>Secret</span>
    </span>
  )
}

/**
 * The Secret mark without a control, for a person who may not change it.
 * A variable that is not secret leaves the place empty, so the values of
 * the rows stay in line.
 */
export function SecretMark(props: { secret: boolean }) {
  return (
    <span className={styles.mark}>
      {props.secret ? (
        <StatusText icon={Lock} label="Secret" tone="neutral" />
      ) : null}
    </span>
  )
}

/** Dots in the place of a value, which no screen shows. */
export function ValueDots() {
  return (
    <span aria-label="Value set" className={styles.value} role="img">
      ••••••••
    </span>
  )
}

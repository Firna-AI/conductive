import { useId } from 'react'
import { Switch } from '@firna/ui/switch'
import { CircleAlert } from 'lucide-react'
import { useControlSizes } from '../common/touch'
import styles from './LoginShare.module.css'

/**
 * A switch under the row of a connected login, in the same box as the
 * rows: its label, the hint that says what the current value does, then the
 * switch, which lines up with Remove. The share setting of a personal login
 * and the switch "Use for every member" of an org login use it.
 *
 * The switch shows the saved value, or the new value while `saving`. After
 * a change that the app did not save, `error` gives the cause under the
 * hint, and the switch shows the saved value again. The spoken name of the
 * switch starts with the name of the agent, from the element with the id
 * `nameId`.
 */
export function SettingSwitch(props: {
  nameId: string
  label: string
  hint: string
  value: boolean
  onChange: (value: boolean) => void
  saving?: boolean
  error?: string | null
}) {
  const labelId = useId()
  const { field } = useControlSizes()
  return (
    <div className={styles.share}>
      <div className={styles.text}>
        <span className={styles.label} id={labelId}>
          {props.label}
        </span>
        <span className={styles.hint}>{props.hint}</span>
        {props.error ? (
          <span className={styles.error} role="alert">
            <CircleAlert aria-hidden className={styles.icon} size={13} />
            <span>Not saved. {props.error}</span>
          </span>
        ) : null}
      </div>
      <Switch
        aria-labelledby={`${props.nameId} ${labelId}`}
        disabled={props.saving}
        onValueChange={props.onChange}
        size={field}
        value={props.value}
      />
    </div>
  )
}

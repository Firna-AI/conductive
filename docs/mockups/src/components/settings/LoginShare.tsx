import { useId } from 'react'
import { Switch } from '@firna/ui/switch'
import { CircleAlert } from 'lucide-react'
import { useControlSizes } from '../common/touch'
import styles from './LoginShare.module.css'

/** What a message of another member in a session of the owner does. */
const hints = {
  shared: 'Their messages in your sessions use this login.',
  kept: 'Their messages in your sessions start a new session on their own login.',
} as const

/**
 * The share setting of a connected login, under its row: whether other
 * members' messages in the sessions of its owner run on it. When it is
 * off, such a message starts a new session on the login of its sender. The
 * hint under the label says what the current value does.
 *
 * The switch shows the saved value, or the new value while `saving`. After
 * a change that the app did not save, `error` gives the cause, and the
 * switch shows the saved value again. `note` adds a line under the hint,
 * such as the terms of a provider that lets only the owner use the login.
 * The spoken name of the switch starts with the name of the agent, from
 * the element with the id `nameId`.
 */
export function LoginShare(props: {
  nameId: string
  shared: boolean
  onChange: (shared: boolean) => void
  saving?: boolean
  error?: string | null
  note?: string
}) {
  const labelId = useId()
  const { field } = useControlSizes()
  return (
    <div className={styles.share}>
      <div className={styles.text}>
        <span className={styles.label} id={labelId}>
          Let other members use this login
        </span>
        <span className={styles.hint}>
          {props.shared ? hints.shared : hints.kept}
        </span>
        {props.note ? <span className={styles.hint}>{props.note}</span> : null}
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
        value={props.shared}
      />
    </div>
  )
}

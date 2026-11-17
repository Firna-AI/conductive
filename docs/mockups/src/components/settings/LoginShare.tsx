import { SettingSwitch } from './SettingSwitch'

/** What a message of another member in a session of the owner does. */
const hints = {
  shared: 'Their messages in your sessions use this login.',
  kept: 'Their messages in your sessions start a new session.',
} as const

/**
 * The share setting of a connected login, under its row: whether other
 * members' messages in the sessions of its owner run on it. When it is
 * off, such a message starts a new session on the login of its sender. The
 * hint under the label says what the current value does.
 *
 * The switch shows the saved value, or the new value while `saving`. After
 * a change that the app did not save, `error` gives the cause, and the
 * switch shows the saved value again. The spoken name of the switch starts
 * with the name of the agent, from the element with the id `nameId`.
 */
export function LoginShare(props: {
  nameId: string
  shared: boolean
  onChange: (shared: boolean) => void
  saving?: boolean
  error?: string | null
}) {
  return (
    <SettingSwitch
      error={props.error}
      hint={props.shared ? hints.shared : hints.kept}
      label="Let other members use this login"
      nameId={props.nameId}
      onChange={props.onChange}
      saving={props.saving}
      value={props.shared}
    />
  )
}

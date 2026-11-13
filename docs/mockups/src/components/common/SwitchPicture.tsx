import { createSwitchStyles } from '@firna/ui/switch'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from './SwitchPicture.module.css'

/**
 * A switch drawn as decoration, in the look of the switch of `@firna/ui`.
 * The row around it owns the switch role and the key presses, such as a
 * menu item with the `menuitemcheckbox` role, so the picture is neither a
 * control nor read aloud.
 */
export function SwitchPicture(props: { on: boolean }) {
  const theme = useSharedUiTheme()
  const parts = createSwitchStyles(theme, 'sm')
  return (
    <span
      aria-hidden
      className={styles.track}
      style={{ ...parts.track, ...(props.on ? parts.trackOn : {}) }}
    >
      <span
        className={styles.knob}
        style={{ ...parts.knob, ...(props.on ? parts.knobOn : {}) }}
      />
    </span>
  )
}

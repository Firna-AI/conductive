import { useSharedUiTheme } from '@firna/ui/theme'
import type { CSSProperties } from 'react'
import {
  ORG_COLORS,
  orgColorLabel,
  orgTileTint,
  type OrgColor,
} from '../../design/orgColors'
import styles from './OrgColorField.module.css'

/**
 * The preset colours of an org as a row of round swatches. They are radio
 * buttons, so the arrow keys move the choice and a screen reader hears the
 * name of each colour. Each swatch takes the ink of the tile in the scheme
 * of the page. `onChange` runs on each choice.
 */
export function OrgColorField(props: {
  value: OrgColor
  onChange: (color: OrgColor) => void
  disabled?: boolean
}) {
  const theme = useSharedUiTheme()
  return (
    <fieldset className={styles.field} disabled={props.disabled}>
      <legend className={styles.legend}>Colour</legend>
      <div className={styles.swatches}>
        {ORG_COLORS.map((color) => {
          const label = orgColorLabel(color)
          const style = {
            '--swatch': orgTileTint(color, theme).ink,
          } as CSSProperties
          return (
            <label className={styles.option} key={color} title={label}>
              <input
                aria-label={label}
                checked={props.value === color}
                className={styles.input}
                name="org-colour"
                onChange={() => props.onChange(color)}
                type="radio"
                value={color}
              />
              <span aria-hidden className={styles.swatch} style={style} />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** The name of a colour beside a small dot of it, for a read-only view. */
export function OrgColorValue(props: { value: OrgColor }) {
  const theme = useSharedUiTheme()
  const style = {
    '--swatch': orgTileTint(props.value, theme).ink,
  } as CSSProperties
  return (
    <span className={styles.value}>
      <span aria-hidden className={styles.dot} style={style} />
      {orgColorLabel(props.value)}
    </span>
  )
}

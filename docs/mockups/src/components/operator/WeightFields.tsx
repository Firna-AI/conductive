import { InputFrame } from '@firna/ui/input'
import { noop } from '../../noop'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import { weightFieldLabel, weightsTotalLine } from './providerCopy'
import styles from './WeightFields.module.css'

/** The weight field of one provider account: its ID, and the text it holds. */
export type WeightField = { id: string; text: string }

/**
 * The weights of new orgs for three or more provider accounts, where one
 * slider does not fit: one field for each account, in whole percent, and
 * a line with the total under them. Save weights needs a total of 100, so
 * the line says what is missing. `total` is null while a field holds no
 * whole number from 0 to 100. `disabled` turns the fields off, such as
 * while a save runs. It imports no fixture, so the app uses it too.
 */
export function WeightFields(props: {
  label: string
  fields: readonly WeightField[]
  total: number | null
  onChange?: (account: string, text: string) => void
  disabled?: boolean
}) {
  const { field } = useControlSizes()
  const onChange = props.onChange
  return (
    <div aria-label={props.label} className={styles.fields} role="group">
      <ul className={styles.list}>
        {props.fields.map((item) => (
          <li className={styles.row} key={item.id}>
            <span className={styles.account}>{item.id}</span>
            <span className={styles.input}>
              <InputFrame
                accessibilityLabel={weightFieldLabel(item.id)}
                editable={!props.disabled}
                inputMode="numeric"
                onChangeText={
                  onChange ? (text) => onChange(item.id, text) : noop
                }
                size={field}
                value={item.text}
              />
            </span>
            <span aria-hidden className={styles.unit}>
              %
            </span>
          </li>
        ))}
      </ul>
      <p className={classes(styles.total, props.total !== 100 && styles.short)}>
        {weightsTotalLine(props.total)}
      </p>
    </div>
  )
}

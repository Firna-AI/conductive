import { InputFrame } from '@firna/ui/input'
import { noop } from '../../../../../src/ui/noop'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { paceFieldLabel, paceWords } from './migrationCopy'
import styles from './PaceFields.module.css'

/** The two fields of the pace of one account: its ID, and their texts. */
export type PaceField = { id: string; perHour: string; atOnce: string }

/** The fields of an account, in the order of the row. */
const fieldKeys = ['perHour', 'atOnce'] as const

/**
 * The pace of the migration job on each provider account: one row for each
 * account, with its ID, its starts in each hour, and its machines at once,
 * as whole numbers. A narrow box puts the fields under the ID. `disabled`
 * turns the fields off, such as while a save runs. It imports no fixture,
 * so the app can use it too.
 */
export function PaceFields(props: {
  fields: readonly PaceField[]
  onChange?: (
    account: string,
    field: (typeof fieldKeys)[number],
    text: string,
  ) => void
  disabled?: boolean
}) {
  const { field } = useControlSizes()
  const onChange = props.onChange
  return (
    <div aria-label={paceWords.label} role="group">
      <ul className={styles.list}>
        {props.fields.map((item) => (
          <li className={styles.row} key={item.id}>
            <span className={styles.account}>{item.id}</span>
            <span className={styles.fields}>
              {fieldKeys.map((key) => (
                <span className={styles.field} key={key}>
                  <span className={styles.input}>
                    <InputFrame
                      accessibilityLabel={paceFieldLabel(item.id, key)}
                      editable={!props.disabled}
                      inputMode="numeric"
                      onChangeText={
                        onChange ? (text) => onChange(item.id, key, text) : noop
                      }
                      size={field}
                      value={item[key]}
                    />
                  </span>
                  <span aria-hidden className={styles.unit}>
                    {paceWords[key]}
                  </span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

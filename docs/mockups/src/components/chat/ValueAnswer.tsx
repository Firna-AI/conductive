import { Input } from '@firna/ui/input'
import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { typedValue, type SecretRunItem } from '../../fixtures/secretRequests'
import { type ValueLifetime } from '../../../../../src/ui/components/chat/secretGrant'
import { noop } from '../../../../../src/ui/noop'
import { classes } from '../../../../../src/ui/components/common/classes'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { saveNeedsName } from '../../../../../src/ui/components/secrets/secretNameCopy'
import {
  lifetimeHint,
  lifetimeLabels,
  storedAlso,
  valueLabel,
} from '../../../../../src/ui/components/chat/secretRunCopy'
import styles from '../../../../../src/ui/components/chat/SecretRequest.module.css'

/**
 * The choices of how long a value lasts, in their order. Save as secret is
 * off when `saves` is false.
 */
function lifetimes(saves: boolean): readonly SegmentOption<ValueLifetime>[] {
  return (['minutes', 'workspace', 'saved'] as const).map((value) => ({
    label: lifetimeLabels[value],
    value,
    disabled: value === 'saved' && !saves,
  }))
}

/** The names of a request that the org does not have, and the others. */
function splitNames(item: SecretRunItem) {
  const { secrets } = item.request
  return {
    missing: secrets.filter((secret) => secret.description === undefined),
    stored: secrets.filter((secret) => secret.description !== undefined),
  }
}

/**
 * The values of a request: one field for each name that the org does not
 * have, and one choice of how long every value lasts. The line under the
 * choices says what the chosen one does. A name with characters that a new
 * secret name cannot use turns Save as secret off, and a line says what
 * Save needs. A request that also names secrets of the org says that Allow
 * allows them for the session too. `labelled` names each field, as a sheet
 * does and as a card with several names does. `sheet` drops the indent of
 * a card.
 */
export function ValueAnswer(props: {
  item: SecretRunItem
  org: string
  labelled: boolean
  sheet?: boolean
}) {
  const { field } = useControlSizes()
  const { missing, stored } = splitNames(props.item)
  const lifetime = props.item.draft?.lifetime ?? 'minutes'
  const typed = props.item.draft?.typed === true
  const names = missing.map((secret) => secret.name).join(', ')
  const saves = missing.every((secret) => secret.invalidName !== true)
  return (
    <div className={classes(styles.answer, props.sheet && styles.inSheet)}>
      {missing.map((secret) => (
        <Input
          accessibilityLabel={valueLabel(secret.name)}
          autoComplete="off"
          key={secret.name}
          label={props.labelled ? secret.name : undefined}
          onChangeText={noop}
          placeholder="Value"
          secureTextEntry
          size={field}
          value={typed ? typedValue : ''}
        />
      ))}
      <SegmentedControl
        accessibilityLabel="How long the value lasts"
        hint={lifetimeHint(lifetime, names, props.org)}
        onChange={noop}
        options={lifetimes(saves)}
        size={field}
        value={lifetime}
        wrap
      />
      {saves ? null : (
        <p className={styles.text}>{saveNeedsName(missing.length)}</p>
      )}
      {stored.length > 0 ? (
        <p className={styles.text}>
          {storedAlso(stored.map((secret) => secret.name).join(', '))}
        </p>
      ) : null}
    </div>
  )
}

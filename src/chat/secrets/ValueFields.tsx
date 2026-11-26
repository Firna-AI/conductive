import { Input } from '@firna/ui/input'
import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { storedAlso, valueLabel } from '../../ui/components/chat/secretRunCopy'
import styles from '../../ui/components/chat/SecretRequest.module.css'
import { classes } from '../../ui/components/common/classes'
import { useControlSizes } from '../../ui/components/common/touch'
import { saveNeedsName } from '../../ui/components/secrets/secretNameCopy'
import type {
  SecretRequest,
  SecretValueLifetime,
} from '../../shared/secret-requests'
import { missingNames } from '../../shared/secret-late-answer'
import { validSecretName } from '../../shared/secret-names'
import { lifetimeChoices, lifetimeLine } from './secret-words'

/** The values that a member types for a request, and how long they last. */
export interface ValueDraft {
  values: Readonly<Record<string, string>>
  lifetime: SecretValueLifetime
}

/** A new draft: no value, for 15 minutes, as the mockups start it. */
export const emptyDraft: ValueDraft = { values: {}, lifetime: '15-minutes' }

/**
 * The draft with the values of `names` only, the names that still ask for a
 * value. A newer request for the same secrets keeps the draft of its card,
 * but the org can have a secret for one of its names by then.
 */
export function draftFor(
  draft: ValueDraft,
  names: readonly string[],
): ValueDraft {
  const kept = Object.entries(draft.values).filter(([name]) =>
    names.includes(name),
  )
  return kept.length === Object.keys(draft.values).length
    ? draft
    : { ...draft, values: Object.fromEntries(kept) }
}

/** Allow waits until each name that the org does not have has a value. */
export function draftReady(request: SecretRequest, draft: ValueDraft): boolean {
  return missingNames(request).every(
    (name) => (draft.values[name] ?? '') !== '',
  )
}

/**
 * The choices of how long the values last, in their order. Save as secret
 * shows, and it is off when `saves` is false.
 */
function choicesOf(saves: boolean): SegmentOption<SecretValueLifetime>[] {
  return lifetimeChoices.map((choice) => ({
    ...choice,
    disabled: choice.value === 'save' && !saves,
  }))
}

/**
 * The values of a request: one field for each name that the org has no
 * secret for, and one choice of how long every value lasts. The line under
 * the choices says what the chosen one does. Save as secret creates a
 * secret with each of these names, so a name that a new secret cannot take
 * turns it off for every value, and a line says what it needs. The names
 * of secrets of the org do not count. A request that also names secrets of
 * the org says that Allow allows them for the session too. `labelled`
 * names each field, as a sheet does and as a card with several names does.
 * `sheet` drops the indent of a card. A value goes out as typed, and no
 * reply brings it back.
 */
export function ValueFields(props: {
  request: SecretRequest
  org: string
  draft: ValueDraft
  change: (draft: ValueDraft) => void
  labelled: boolean
  disabled: boolean
  sheet?: boolean
}) {
  const { field } = useControlSizes()
  const { request, draft } = props
  const missing = missingNames(request)
  const saves = missing.every((name) => validSecretName(name))
  const stored = request.secrets
    .map((secret) => secret.name)
    .filter((name) => !missing.includes(name))
  return (
    <div className={classes(styles.answer, props.sheet && styles.inSheet)}>
      {missing.map((name) => (
        <Input
          accessibilityLabel={valueLabel(name)}
          autoComplete="off"
          editable={!props.disabled}
          key={name}
          label={props.labelled ? name : undefined}
          onChangeText={(text) =>
            props.change({
              ...draft,
              values: { ...draft.values, [name]: text },
            })
          }
          placeholder="Value"
          secureTextEntry
          size={field}
          value={draft.values[name] ?? ''}
        />
      ))}
      <SegmentedControl
        accessibilityLabel="How long the value lasts"
        disabled={props.disabled}
        hint={lifetimeLine(draft.lifetime, missing.join(', '), props.org)}
        onChange={(lifetime) => props.change({ ...draft, lifetime })}
        options={choicesOf(saves)}
        size={field}
        value={draft.lifetime}
        wrap
      />
      {saves ? null : (
        <p className={styles.text}>{saveNeedsName(missing.length)}</p>
      )}
      {stored.length > 0 ? (
        <p className={styles.text}>{storedAlso(stored.join(', '))}</p>
      ) : null}
    </div>
  )
}

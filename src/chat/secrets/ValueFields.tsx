import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import {
  storedAlso,
  valueLabel,
} from '../../../docs/mockups/src/components/chat/secretRunCopy'
import styles from '../../../docs/mockups/src/components/chat/SecretRequest.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import type {
  SecretRequest,
  SecretValueLifetime,
} from '../../shared/secret-requests'
import { lifetimeChoices, lifetimeLine, missingNames } from './secret-words'

/** The values that a member types for a request, and how long they last. */
export interface ValueDraft {
  values: Readonly<Record<string, string>>
  lifetime: SecretValueLifetime
}

/** A new draft: no value, for 15 minutes, as the mockups start it. */
export const emptyDraft: ValueDraft = { values: {}, lifetime: '15-minutes' }

/** Allow waits until each name that the org does not have has a value. */
export function draftReady(request: SecretRequest, draft: ValueDraft): boolean {
  return missingNames(request).every(
    (name) => (draft.values[name] ?? '') !== '',
  )
}

/**
 * The values of a request (secrets decision 7): one field for each name
 * that the org has no secret for, and one choice of how long every value
 * lasts. The line under the choices says what the chosen one does. A
 * request that also names secrets of the org says that Allow allows them for
 * the session too. `labelled` names each field, as a sheet does and as a
 * card with several names does. `sheet` drops the indent of a card. A value
 * goes out as typed, and no reply brings it back.
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
        options={lifetimeChoices}
        size={field}
        value={draft.lifetime}
        wrap
      />
      {stored.length > 0 ? (
        <p className={styles.text}>{storedAlso(stored.join(', '))}</p>
      ) : null}
    </div>
  )
}

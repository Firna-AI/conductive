import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { Switch } from '@firna/ui/switch'
import { Plus } from 'lucide-react'
import { useControlSizes } from '../../ui/components/common/touch'
import {
  addNameHint,
  refusedNameError,
} from '../../ui/components/secrets/secretNameCopy'
import {
  allAgentsHint,
  secretsWords,
} from '../../ui/components/secrets/secretsCopy'
import styles from '../../ui/components/secrets/SecretsTab.module.css'
import sections from '../../ui/components/settings/Section.module.css'
import type { ApiError } from '../../app/api/client'
import type { SecretsModel } from '../../app/secrets-model'
import type { OrgSummary } from '../../shared/orgs'
import type { OrgSecret, ReplaceSecretRequest } from '../../shared/secrets'
import { ActionButton } from '../ui/actions'
import { useValueForm } from './useValueForm'

/**
 * The Replace form under the row of a secret: its description, which the
 * form shows to change, and an empty field of a new value. An empty field
 * keeps the stored value, because the browser has no value to show
 * (secrets decision 3 B). A save without a change sends nothing.
 * `valueChanged` runs after a save of a new value.
 */
export function ReplaceSecretForm(props: {
  secret: OrgSecret
  model: SecretsModel
  close: () => void
  valueChanged: () => void
}) {
  const { secret, model } = props
  const { field } = useControlSizes()
  const [description, setDescription] = useState(secret.description)
  const { form, value, state, save } = useValueForm(props.close)
  const submit = () => {
    save(secret.name, async (typed) => {
      const described = description.trim()
      const request: ReplaceSecretRequest = {
        ...(described === secret.description ? {} : { description: described }),
        ...(typed === '' ? {} : { value: typed }),
      }
      if (request.description === undefined && request.value === undefined) {
        return
      }
      await model.replace(secret.id, request)
      if (request.value !== undefined) props.valueChanged()
    })
  }
  return (
    <span className={styles.edit}>
      <Input
        accessibilityLabel={`Description of ${secret.name}`}
        editable={!state.saving}
        hint={secretsWords.descriptionHint}
        label={secretsWords.description}
        onChangeText={setDescription}
        size={field}
        value={description}
      />
      <Input
        accessibilityLabel={`New value of ${secret.name}`}
        autoComplete="off"
        editable={!state.saving}
        error={state.error?.message}
        hint={secretsWords.keepValue}
        label={secretsWords.newValue}
        onChangeText={(text) => form.set(text)}
        onSubmitEditing={submit}
        secureTextEntry
        size={field}
        value={value}
      />
      <span className={sections.actions}>
        <ActionButton onPress={props.close}>{secretsWords.cancel}</ActionButton>
        <ActionButton busy={state.saving} onPress={submit} tone="primary">
          Save
        </ActionButton>
      </span>
    </span>
  )
}

/**
 * The switch for all agents of the Add secret form of an admin, with its
 * label and its hint. It starts off, so a new secret needs an answer in
 * each session.
 */
function AllAgentsField(props: {
  org: string
  on: boolean
  change: (on: boolean) => void
  disabled: boolean
}) {
  const { field } = useControlSizes()
  return (
    <span className={styles.switchField}>
      <Switch
        accessibilityLabel={secretsWords.allAgents}
        disabled={props.disabled}
        onValueChange={props.change}
        size={field === 'lg' ? 'md' : 'sm'}
        value={props.on}
      />
      <span className={styles.switchText}>
        <span className={styles.switchLabel}>{secretsWords.allAgents}</span>
        <span className={styles.switchHint}>{allAgentsHint(props.org)}</span>
      </span>
    </span>
  )
}

/**
 * The refusal of the name of a new secret, which shows under the name: a
 * name that the org has already, or a name with characters that a new name
 * cannot use. Null for any other error, which shows under the value.
 */
function nameRefusal(error: ApiError | null): string | null {
  switch (error?.code) {
    case 'secret_name_exists':
      return error.message
    case 'invalid_secret_name':
      return refusedNameError
    default:
      return null
  }
}

/**
 * A new secret: its name, its description, and its value. The form of an
 * admin also sets the mark for all agents, which starts off. A member has
 * no switch, because only admins set the mark. The name must not be empty,
 * and its hint gives the characters that a new name can use. The Worker
 * checks them. A name that the org has already shows its refusal under the
 * name, and a name with other characters shows its refusal in place of the
 * hint. Each field keeps its text after a refusal, and a new name ends the
 * refusal of the name.
 */
export function AddSecretForm(props: {
  org: OrgSummary
  model: SecretsModel
  mark: boolean
  close: () => void
}) {
  const { field } = useControlSizes()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [allAgents, setAllAgents] = useState(false)
  const { form, value, state, save } = useValueForm(props.close)
  const added = name.trim()
  const ready = added !== ''
  const refusal = nameRefusal(state.error)
  const invalid = state.error?.code === 'invalid_secret_name'
  const add = () => {
    if (!ready) return
    save(added, (typed) =>
      props.model.create({
        name: added,
        description: description.trim(),
        value: typed,
        ...(props.mark ? { allAgents } : {}),
      }),
    )
  }
  return (
    <>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        editable={!state.saving}
        error={refusal}
        hint={invalid ? undefined : addNameHint}
        label={secretsWords.name}
        onChangeText={(text) => {
          setName(text)
          // A new name ends the refusal of the name.
          if (refusal !== null) form.set(value)
        }}
        size={field}
        spellCheck={false}
        value={name}
      />
      <Input
        editable={!state.saving}
        hint={secretsWords.descriptionHint}
        label={secretsWords.description}
        onChangeText={setDescription}
        size={field}
        value={description}
      />
      <Input
        autoComplete="off"
        editable={!state.saving}
        error={refusal === null ? state.error?.message : undefined}
        hint={secretsWords.valueHint}
        label={secretsWords.value}
        onChangeText={(text) => form.set(text)}
        onSubmitEditing={add}
        secureTextEntry
        size={field}
        value={value}
      />
      {props.mark ? (
        <AllAgentsField
          change={setAllAgents}
          disabled={state.saving}
          on={allAgents}
          org={props.org.name}
        />
      ) : null}
      <div className={sections.actions}>
        <ActionButton onPress={props.close}>{secretsWords.cancel}</ActionButton>
        <ActionButton
          busy={state.saving}
          disabled={!ready}
          icon={Plus}
          onPress={add}
          tone="primary"
        >
          {secretsWords.save}
        </ActionButton>
      </div>
    </>
  )
}

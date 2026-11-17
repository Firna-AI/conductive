import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { Switch } from '@firna/ui/switch'
import { Plus } from 'lucide-react'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import {
  allAgentsHint,
  secretsWords,
} from '../../../docs/mockups/src/components/secrets/secretsCopy'
import styles from '../../../docs/mockups/src/components/secrets/SecretsTab.module.css'
import sections from '../../../docs/mockups/src/components/settings/Section.module.css'
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
 * A new secret: its name, its description, and its value. The form of an
 * admin also sets the mark for all agents, which starts off. A member has
 * no switch, because only admins set the mark (secrets decision 3 B). The
 * name must not be empty. A name that the org has already shows its
 * refusal under the name.
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
  const taken = state.error?.code === 'secret_name_exists'
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
        error={taken ? state.error?.message : undefined}
        hint={secretsWords.nameHint}
        label={secretsWords.name}
        onChangeText={(text) => {
          setName(text)
          // A new name ends the refusal of the name that the org has.
          if (taken) form.set(value)
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
        error={taken ? undefined : state.error?.message}
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

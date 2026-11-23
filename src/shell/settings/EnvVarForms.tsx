import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { Plus, X } from 'lucide-react'
import { productName } from '../../shared/brand'
import { classes } from '../../ui/components/common/classes'
import { useControlSizes } from '../../ui/components/common/touch'
import { SecretSwitch } from '../../ui/components/settings/EnvVarParts'
import styles from '../../ui/components/settings/EnvironmentSections.module.css'
import sections from '../../ui/components/settings/Section.module.css'
import type { ComputerModel } from '../../app/computer-model'
import { ActionButton, IconButton } from '../ui/actions'
import { MarkSwitch, useMark, type EnvVar } from './EnvVarMark'
import { useValueForm } from './useValueForm'

/**
 * A new value for a variable, in its row, with Save and Cancel. The save
 * sends no mark, so the Worker keeps the stored mark, also a mark that a
 * save of the switch changed after this row opened. The Secret switch
 * stays in the row. A write of the mark holds Save, and a save of the
 * value holds the switch.
 */
export function ChangeValueRow(props: {
  item: EnvVar
  computer: ComputerModel
  close: () => void
}) {
  const { item, computer } = props
  const { field } = useControlSizes()
  const mark = useMark(computer, item)
  const { form, value, state, save } = useValueForm(props.close)
  const submit = () => {
    if (mark.pending) return
    save(item.name, (typed) => computer.replaceEnvVar(item.name, typed))
  }
  return (
    <li className={classes(styles.row, styles.editable, styles.changing)}>
      <span className={styles.name}>{item.name}</span>
      <MarkSwitch
        disabled={mark.pending || state.saving}
        item={item}
        mark={mark}
      />
      <span className={styles.edit}>
        <Input
          accessibilityLabel={`New value of ${item.name}`}
          autoComplete="off"
          editable={!state.saving}
          error={state.error?.message}
          onChangeText={(text) => form.set(text)}
          onSubmitEditing={submit}
          placeholder="New value"
          secureTextEntry
          size={field}
          value={value}
        />
        <ActionButton
          busy={state.saving}
          disabled={mark.pending}
          onPress={submit}
          tone="primary"
        >
          Save
        </ActionButton>
        <IconButton icon={X} label="Cancel" onPress={props.close} />
      </span>
    </li>
  )
}

/**
 * A new variable: its name, its value, and its Secret mark, which is on at
 * the start. The name must not be empty. The value may be empty, as the
 * value of an env var may.
 */
export function AddVariableForm(props: {
  computer: ComputerModel
  close: () => void
}) {
  const { field } = useControlSizes()
  const [name, setName] = useState('')
  const [secret, setSecret] = useState(true)
  const { form, value, state, save } = useValueForm(props.close)
  const added = name.trim()
  const ready = added !== ''
  const add = () => {
    if (!ready) return
    save(added, (typed) => props.computer.setEnvVar(added, typed, secret))
  }
  return (
    <>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        label="Name"
        onChangeText={setName}
        size={field}
        spellCheck={false}
        value={name}
      />
      <Input
        autoComplete="off"
        editable={!state.saving}
        error={state.error?.message}
        hint={`${productName} keeps it encrypted, and never shows it again.`}
        label="Value"
        onChangeText={(text) => form.set(text)}
        onSubmitEditing={add}
        secureTextEntry
        size={field}
        value={value}
      />
      <SecretSwitch
        disabled={state.saving}
        label="Secret"
        onValueChange={setSecret}
        value={secret}
      />
      <div className={sections.actions}>
        <ActionButton onPress={props.close}>Cancel</ActionButton>
        <ActionButton
          busy={state.saving}
          disabled={!ready}
          icon={Plus}
          onPress={add}
          tone="primary"
        >
          Save variable
        </ActionButton>
      </div>
    </>
  )
}

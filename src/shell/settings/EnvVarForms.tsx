import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { useToast } from '@firna/ui/toast'
import { Plus, X } from 'lucide-react'
import { productName } from '../../../docs/mockups/src/brand'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { SecretSwitch } from '../../../docs/mockups/src/components/settings/EnvVarParts'
import styles from '../../../docs/mockups/src/components/settings/EnvironmentSections.module.css'
import sections from '../../../docs/mockups/src/components/settings/Section.module.css'
import type { ComputerModel } from '../../app/computer-model'
import { SecretForm } from '../../app/secret-form'
import { useStore } from '../../app/store'
import { isOrgRefusal } from '../../app/suspension'
import { ActionButton, IconButton } from '../ui/actions'
import { MarkSwitch, useMark, type EnvVar } from './EnvVarMark'

/**
 * Saves the value of a variable with its Secret mark through a secret
 * form, and closes the form after the save. The value leaves the browser
 * once and never comes back. A failed save shows its message under the
 * field. A refusal because the org is suspended also ends the permission,
 * so the form closes, and a toast shows the message instead.
 */
function useValueForm(computer: ComputerModel, close: () => void) {
  // The value goes out as typed: it may be empty, and its spaces stay.
  const [form] = useState(() => new SecretForm({ raw: true }))
  const value = useStore(form.value)
  const state = useStore(form.state)
  const { toast } = useToast()
  const save = (name: string, secret: boolean) => {
    void form
      .submit((typed) => computer.setEnvVar(name, typed, secret))
      .then((saved) => {
        if (saved) {
          close()
          return
        }
        const { error } = form.state.get()
        if (error && isOrgRefusal(error)) {
          toast({
            title: `${name} was not saved`,
            description: error.message,
            tone: 'error',
          })
        }
      })
  }
  return { form, value, state, save }
}

/**
 * A new value for a variable, in its row, with Save and Cancel. The new
 * value keeps the saved mark, and the Secret switch stays in the row. A
 * write of the mark holds Save, and a save of the value holds the switch.
 */
export function ChangeValueRow(props: {
  item: EnvVar
  computer: ComputerModel
  close: () => void
}) {
  const { item } = props
  const { field } = useControlSizes()
  const mark = useMark(props.computer, item)
  const { form, value, state, save } = useValueForm(props.computer, props.close)
  const submit = () => {
    if (!mark.pending) save(item.name, item.secret)
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
  const { form, value, state, save } = useValueForm(props.computer, props.close)
  const ready = name.trim() !== ''
  const add = () => {
    if (ready) save(name.trim(), secret)
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

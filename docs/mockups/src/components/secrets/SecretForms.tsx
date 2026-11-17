import { Input } from '@firna/ui/input'
import { Switch } from '@firna/ui/switch'
import { Plus } from 'lucide-react'
import { newSecret, type OrgSecret } from '../../fixtures/secrets'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { allAgentsHint, secretsWords } from './secretsCopy'
import sections from '../settings/Section.module.css'
import styles from './SecretsTab.module.css'

/**
 * The Replace form under the row of a secret: its description, which the
 * form shows to change, and a new value (item 9 of the mockups). The
 * browser has no stored value, so the field of the value starts empty, and
 * an empty field keeps the value. The creator of the secret and the admins
 * use it, as `secretRights` says.
 */
export function ReplaceForm(props: { secret: OrgSecret }) {
  const { field } = useControlSizes()
  const { secret } = props
  return (
    <span className={styles.edit}>
      <Input
        accessibilityLabel={`Description of ${secret.name}`}
        hint={secretsWords.descriptionHint}
        label={secretsWords.description}
        onChangeText={noop}
        size={field}
        value={secret.description}
      />
      <Input
        accessibilityLabel={`New value of ${secret.name}`}
        autoComplete="off"
        hint={secretsWords.keepValue}
        label={secretsWords.newValue}
        onChangeText={noop}
        secureTextEntry
        size={field}
        value=""
      />
      <span className={sections.actions}>
        <ActionButton>{secretsWords.cancel}</ActionButton>
        <ActionButton tone="primary">Save</ActionButton>
      </span>
    </span>
  )
}

/**
 * The switch for all agents of the form, with its label and its hint.
 * It starts off, so a new secret needs an answer in each session.
 */
function AllAgentsField(props: { org: string }) {
  const { field } = useControlSizes()
  return (
    <span className={styles.switchField}>
      <Switch
        accessibilityLabel={secretsWords.allAgents}
        onValueChange={noop}
        size={field === 'lg' ? 'md' : 'sm'}
        value={false}
      />
      <span className={styles.switchText}>
        <span className={styles.switchLabel}>{secretsWords.allAgents}</span>
        <span className={styles.switchHint}>{allAgentsHint(props.org)}</span>
      </span>
    </span>
  )
}

/**
 * A new secret: its name, its description, and its value. An admin also
 * sets the mark for all agents, which starts off. A member has no switch,
 * because only admins set the mark (secrets decision 3).
 */
export function AddSecretForm(props: { org: string; mark: boolean }) {
  const { field } = useControlSizes()
  return (
    <>
      <Input
        autoComplete="off"
        hint={secretsWords.nameHint}
        label={secretsWords.name}
        onChangeText={noop}
        size={field}
        value={newSecret.name}
      />
      <Input
        hint={secretsWords.descriptionHint}
        label={secretsWords.description}
        onChangeText={noop}
        size={field}
        value={newSecret.description}
      />
      <Input
        autoComplete="off"
        hint={secretsWords.valueHint}
        label={secretsWords.value}
        onChangeText={noop}
        secureTextEntry
        size={field}
        value={newSecret.value}
      />
      {props.mark ? <AllAgentsField org={props.org} /> : null}
      <div className={sections.actions}>
        <ActionButton>{secretsWords.cancel}</ActionButton>
        <ActionButton icon={Plus} tone="primary">
          {secretsWords.save}
        </ActionButton>
      </div>
    </>
  )
}

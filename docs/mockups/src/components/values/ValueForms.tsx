import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { Switch } from '@firna/ui/switch'
import { Plus } from 'lucide-react'
import { productName } from '../../brand'
import {
  newStartValue,
  renamedSecret,
  renamedVariable,
  type OrgValue,
} from '../../fixtures/orgValues'
import { newSecret } from '../../fixtures/secrets'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { addNameHint, refusedNameError } from '../secrets/secretNameCopy'
import { allAgentsHint, secretsWords } from '../secrets/secretsCopy'
import secrets from '../secrets/SecretsTab.module.css'
import sections from '../settings/Section.module.css'
import {
  hideWords,
  kindChoice,
  kindWords,
  renameWords,
  startNameHint,
} from './valuesCopy'
import styles from './ValuesTab.module.css'

/**
 * The Rename form under a row, in the place of the value and the actions.
 * The new name follows the rule of new secret names, for both kinds
 * (item 4 B). The hint says what the rename changes for that kind.
 */
export function RenameForm(props: { value: OrgValue }) {
  const { field } = useControlSizes()
  const { value } = props
  const to = value.kind === 'start' ? renamedVariable.to : renamedSecret.to
  const hint =
    value.kind === 'start'
      ? renameWords.startHint(value.name)
      : renameWords.approvalHint(value.name)
  return (
    <span className={secrets.edit}>
      <Input
        accessibilityLabel={`New name of ${value.name}`}
        autoComplete="off"
        hint={`${hint} ${refusedNameError}`}
        label={renameWords.label}
        onChangeText={noop}
        size={field}
        value={to}
      />
      <span className={sections.actions}>
        <ActionButton>{secretsWords.cancel}</ActionButton>
        <ActionButton tone="primary">{renameWords.save}</ActionButton>
      </span>
    </span>
  )
}

/** A switch of the Add secret form, with its label and its hint. */
function SwitchField(props: { label: string; hint: string; value: boolean }) {
  const { field } = useControlSizes()
  return (
    <span className={secrets.switchField}>
      <Switch
        accessibilityLabel={props.label}
        onValueChange={noop}
        size={field === 'lg' ? 'md' : 'sm'}
        value={props.value}
      />
      <span className={secrets.switchText}>
        <span className={secrets.switchLabel}>{props.label}</span>
        <span className={secrets.switchHint}>{props.hint}</span>
      </span>
    </span>
  )
}

/** The choice of the kind, which only an admin sees, with its hint. */
function KindField(props: { org: string; kind: 'start' | 'approval' }) {
  const { field } = useControlSizes()
  return (
    <div className={styles.kind}>
      <span className={styles.kindLabel}>{kindChoice.label}</span>
      <SegmentedControl
        accessibilityLabel={kindChoice.label}
        onChange={noop}
        options={[
          { label: kindWords.approval, value: 'approval' },
          { label: kindWords.start, value: 'start' },
        ]}
        size={field}
        value={props.kind}
      />
      <span className={styles.kindHint}>
        {props.kind === 'start'
          ? kindChoice.startHint(props.org)
          : kindChoice.approvalHint}
      </span>
    </div>
  )
}

/**
 * One Add secret form for both kinds (item 1 B). An admin first chooses how
 * agents get the value. After approval asks for the name, the description,
 * and the value, and the switch for all agents. Each start asks for the
 * name and the value, and the mark Hide on screen, which starts on
 * (decision 133). A member adds only secrets, so the form of a member has
 * no choice and no switch.
 */
export function AddValueForm(props: {
  org: string
  admin: boolean
  kind: 'start' | 'approval'
}) {
  const { field } = useControlSizes()
  const start = props.admin && props.kind === 'start'
  return (
    <>
      {props.admin ? <KindField kind={props.kind} org={props.org} /> : null}
      <Input
        autoComplete="off"
        hint={start ? startNameHint : addNameHint}
        label={secretsWords.name}
        onChangeText={noop}
        size={field}
        value={start ? newStartValue.name : newSecret.name}
      />
      {start ? null : (
        <Input
          hint={secretsWords.descriptionHint}
          label={secretsWords.description}
          onChangeText={noop}
          size={field}
          value={newSecret.description}
        />
      )}
      <Input
        autoComplete="off"
        hint={
          start
            ? `${productName} keeps it encrypted, and never shows it again.`
            : secretsWords.valueHint
        }
        label={secretsWords.value}
        onChangeText={noop}
        secureTextEntry
        size={field}
        value={start ? newStartValue.value : newSecret.value}
      />
      {start ? (
        <SwitchField hint={hideWords.hint} label={hideWords.label} value />
      ) : null}
      {props.admin && !start ? (
        <SwitchField
          hint={allAgentsHint(props.org)}
          label={secretsWords.allAgents}
          value={false}
        />
      ) : null}
      <div className={sections.actions}>
        <ActionButton>{secretsWords.cancel}</ActionButton>
        <ActionButton icon={Plus} tone="primary">
          {secretsWords.save}
        </ActionButton>
      </div>
    </>
  )
}

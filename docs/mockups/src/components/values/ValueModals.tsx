import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import type { Viewport } from '@mokly/mokly'
import { Plus } from 'lucide-react'
import { productName } from '../../brand'
import { people, type PersonKey } from '../../fixtures/members'
import { newEnvValue, type OrgValue } from '../../fixtures/orgValues'
import { newSecret } from '../../fixtures/secrets'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { addNameHint, refusedNameError } from '../secrets/secretNameCopy'
import {
  addedBy,
  allAgentsHint,
  revealedBy,
  secretsWords,
} from '../secrets/secretsCopy'
import { SwitchField } from './ValueParts'
import {
  addWords,
  editWords,
  envNameHint,
  hideWords,
  kindChoice,
} from './valuesCopy'
import styles from './ValuesTab.module.css'

/** Cancel, which closes the modal, and the action that saves. */
function ModalActions(props: { save: string; add?: boolean }) {
  return (
    <>
      <ScreenLink asChild to={paths.values}>
        <ActionButton>{secretsWords.cancel}</ActionButton>
      </ScreenLink>
      <ActionButton icon={props.add ? Plus : undefined} tone="primary">
        {props.save}
      </ActionButton>
    </>
  )
}

/** The choice of the type, which only an admin sees, with its hint. */
function KindField(props: { kind: 'env' | 'secret' }) {
  const { field } = useControlSizes()
  return (
    <div className={styles.kind}>
      <span className={styles.kindLabel}>{kindChoice.label}</span>
      <SegmentedControl
        accessibilityLabel={kindChoice.label}
        onChange={noop}
        options={[
          { label: kindChoice.secret, value: 'secret' },
          { label: kindChoice.env, value: 'env' },
        ]}
        size={field}
        value={props.kind}
      />
      <span className={styles.hint}>
        {props.kind === 'env' ? kindChoice.envHint : kindChoice.secretHint}
      </span>
    </div>
  )
}

/**
 * The Add modal, for both kinds. An admin first chooses the type. A secret
 * asks for the name, the description, the value, and, for an admin, the
 * switch for all agents. An env var asks for the name, the value, and Hide
 * on screen, which starts on (decision 133). A member adds only secrets, so
 * the modal of a member has no type.
 */
export function AddValueModal(props: {
  viewport: Viewport
  org: string
  admin: boolean
  kind: 'env' | 'secret'
}) {
  const { field } = useControlSizes()
  const env = props.admin && props.kind === 'env'
  return (
    <ConfirmDialog
      actions={<ModalActions add save={addWords.save} />}
      title={env ? addWords.envTitle : addWords.secretTitle}
      viewport={props.viewport}
      wide
    >
      <div className={styles.fields}>
        {props.admin ? <KindField kind={props.kind} /> : null}
        <Input
          autoComplete="off"
          hint={env ? envNameHint : addNameHint}
          label={secretsWords.name}
          onChangeText={noop}
          size={field}
          value={env ? newEnvValue.name : newSecret.name}
        />
        {env ? null : (
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
            env
              ? `${productName} keeps it encrypted, and never shows it again.`
              : secretsWords.valueHint
          }
          label={secretsWords.value}
          onChangeText={noop}
          secureTextEntry
          size={field}
          value={env ? newEnvValue.value : newSecret.value}
        />
        {env ? (
          <SwitchField hint={hideWords.hint} label={hideWords.label} value />
        ) : null}
        {props.admin && !env ? (
          <SwitchField
            hint={allAgentsHint(props.org)}
            label={secretsWords.allAgents}
            value={false}
          />
        ) : null}
      </div>
    </ConfirmDialog>
  )
}

/** A member as the modal names them: "you" for the person signed in. */
function nameOf(person: PersonKey, viewer: PersonKey): string {
  return person === viewer ? 'you' : people[person].name
}

/** Who added a secret, and the record of its last reveal. */
function secretRecord(value: OrgValue, viewer: PersonKey): string | null {
  if (value.kind !== 'secret') return null
  const { creator, revealed } = value.secret
  const added = addedBy(nameOf(creator, viewer))
  if (!revealed) return `${added}.`
  return `${added} · ${revealedBy(nameOf(revealed.by, viewer), revealed.when)}`
}

/**
 * The Edit modal of a value, which also renames it. The name follows the
 * rule of new names for both kinds (item 4 B). An empty value keeps the
 * current value, because the browser never gets it. A secret shows who
 * added it and its last reveal. An admin also switches its mark: All agents
 * for a secret, and Hide on screen for an env var.
 */
export function EditValueModal(props: {
  viewport: Viewport
  org: string
  value: OrgValue
  newName: string
  admin: boolean
  viewer: PersonKey
}) {
  const { field } = useControlSizes()
  const { value } = props
  const env = value.kind === 'env'
  const record = secretRecord(value, props.viewer)
  return (
    <ConfirmDialog
      actions={<ModalActions save={editWords.save} />}
      title={editWords.title(value.name)}
      viewport={props.viewport}
      wide
    >
      <div className={styles.fields}>
        <Input
          autoComplete="off"
          hint={`${env ? editWords.envNameHint : editWords.secretNameHint} ${refusedNameError}`}
          label={editWords.name}
          onChangeText={noop}
          size={field}
          value={props.newName}
        />
        {value.kind === 'secret' ? (
          <Input
            hint={secretsWords.descriptionHint}
            label={secretsWords.description}
            onChangeText={noop}
            size={field}
            value={value.secret.description}
          />
        ) : null}
        <Input
          autoComplete="off"
          hint={editWords.keepValue}
          label={editWords.newValue}
          onChangeText={noop}
          secureTextEntry
          size={field}
          value=""
        />
        {props.admin && value.kind === 'env' ? (
          <SwitchField
            hint={hideWords.hint}
            label={hideWords.label}
            value={value.variable.secret}
          />
        ) : null}
        {props.admin && value.kind === 'secret' ? (
          <SwitchField
            hint={allAgentsHint(props.org)}
            label={secretsWords.allAgents}
            value={value.secret.allAgents}
          />
        ) : null}
        <span className={styles.hint}>
          {env ? editWords.envApplies : record}
        </span>
      </div>
    </ConfirmDialog>
  )
}

import { Input } from '@firna/ui/input'
import type { Viewport } from '@mokly/mokly'
import { people, type PersonKey } from '../../fixtures/members'
import type { OrgValue } from '../../fixtures/orgValues'
import { noop } from '../../noop'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useControlSizes } from '../common/touch'
import { refusedNameError } from '../secrets/secretNameCopy'
import {
  addedBy,
  allAgentsHint,
  revealedBy,
  secretsWords,
} from '../secrets/secretsCopy'
import { KindField, ModalActions, SwitchField } from './ValueParts'
import { editWords, hideWords } from './valuesCopy'
import styles from './ValuesTab.module.css'

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

/** The hint of the type: what the type does, or what a change of it does. */
function typeHint(value: OrgValue, kind: 'env' | 'secret'): string | undefined {
  if (kind === value.kind) return undefined
  return kind === 'secret' ? editWords.toSecret : editWords.toEnv
}

/**
 * The Edit modal of a value, which also renames it and, for an admin,
 * changes its type (item 2). The name follows the rule of new names for
 * both types (item 4 B). An empty value keeps the current value, because
 * the browser never gets it. A secret shows its description, the switch
 * for all agents of an admin, who added it, and its last reveal. An env
 * var shows Hide on screen to an admin. `kind` is the type that the modal
 * shows, which differs from the type of the value after a change.
 */
export function EditValueModal(props: {
  viewport: Viewport
  org: string
  value: OrgValue
  newName: string
  kind: 'env' | 'secret'
  admin: boolean
  viewer: PersonKey
}) {
  const { field } = useControlSizes()
  const { value, kind, admin } = props
  const env = kind === 'env'
  const description = value.kind === 'secret' ? value.secret.description : ''
  return (
    <ConfirmDialog
      actions={<ModalActions save={editWords.save} />}
      title={editWords.title(value.name)}
      viewport={props.viewport}
      wide
    >
      <div className={styles.fields}>
        {admin ? <KindField hint={typeHint(value, kind)} kind={kind} /> : null}
        <Input
          autoComplete="off"
          hint={`${env ? editWords.envNameHint : editWords.secretNameHint} ${refusedNameError}`}
          label={editWords.name}
          onChangeText={noop}
          size={field}
          value={props.newName}
        />
        {env ? null : (
          <Input
            hint={secretsWords.descriptionHint}
            label={secretsWords.description}
            onChangeText={noop}
            size={field}
            value={description}
          />
        )}
        <Input
          autoComplete="off"
          hint={editWords.keepValue}
          label={editWords.newValue}
          onChangeText={noop}
          secureTextEntry
          size={field}
          value=""
        />
        {admin && env && value.kind === 'env' ? (
          <SwitchField
            hint={hideWords.hint}
            label={hideWords.label}
            value={value.variable.secret}
          />
        ) : null}
        {admin && !env ? (
          <SwitchField
            hint={allAgentsHint(props.org)}
            label={secretsWords.allAgents}
            value={value.kind === 'secret' && value.secret.allAgents}
          />
        ) : null}
        <span className={styles.hint}>
          {env ? editWords.envApplies : secretRecord(value, props.viewer)}
        </span>
      </div>
    </ConfirmDialog>
  )
}

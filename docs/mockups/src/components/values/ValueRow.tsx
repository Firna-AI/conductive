import {
  ArrowRightLeft,
  Eye,
  Pencil,
  TextCursorInput,
  Trash2,
} from 'lucide-react'
import { people, type PersonKey } from '../../fixtures/members'
import type { OrgValue } from '../../fixtures/orgValues'
import { ValueDots } from '../settings/EnvVarParts'
import { AllAgentsMark, AllAgentsSwitch } from '../secrets/SecretParts'
import { secretRights, type SecretsAccess } from '../secrets/secretRights'
import { addedBy, revealedBy } from '../secrets/secretsCopy'
import secrets from '../secrets/SecretsTab.module.css'
import { RenameForm } from './ValueForms'
import { HideMark, HideSwitch, KindText, RowAction } from './ValueParts'
import { rowActionLabels } from './valuesCopy'
import styles from './ValuesTab.module.css'

/** The screens that the actions of a row lead to, where the mockups draw them. */
export type ValueLinks = { rename?: string; move?: string }

/** What a person may do with one value. */
type ValueRights = {
  reveal: boolean
  mark: boolean
  change: boolean
  move: boolean
}

/**
 * The rights of a value. A secret keeps the rights of secrets decision 3 B.
 * Only an admin changes a value for each start (decision 57), and only an
 * admin moves it to After approval (item 2 C). Rename follows the right to
 * change.
 */
function valueRights(value: OrgValue, access: SecretsAccess): ValueRights {
  if (value.kind === 'approval') {
    return { ...secretRights(value.secret, access), move: false }
  }
  const admin = access.kind === 'admin'
  return { reveal: false, mark: admin, change: admin, move: admin }
}

/** A member as a row names them: "you" for the person signed in. */
function nameOf(person: PersonKey, viewer: PersonKey): string {
  return person === viewer ? 'you' : people[person].name
}

/** The kind, then who added a secret and the record of its last reveal. */
function Meta(props: { value: OrgValue; viewer: PersonKey }) {
  const { value, viewer } = props
  const parts: string[] = []
  if (value.kind === 'approval') {
    parts.push(addedBy(nameOf(value.secret.creator, viewer)))
    const reveal = value.secret.revealed
    if (reveal) parts.push(revealedBy(nameOf(reveal.by, viewer), reveal.when))
  }
  return (
    <span className={styles.meta}>
      <KindText kind={value.kind} />
      {parts.map((part) => (
        <span key={part}>· {part}</span>
      ))}
    </span>
  )
}

/** The mark of the row: Hide on screen, or the mark for all agents. */
function Mark(props: { value: OrgValue; editable: boolean }) {
  const { value, editable } = props
  if (value.kind === 'start') {
    return editable ? (
      <HideSwitch name={value.name} value={value.variable.secret} />
    ) : (
      <HideMark on={value.variable.secret} />
    )
  }
  return editable ? (
    <AllAgentsSwitch
      label={`${value.name} for all agents`}
      value={value.secret.allAgents}
    />
  ) : (
    <AllAgentsMark on={value.secret.allAgents} />
  )
}

/** Reveal, Rename, Replace or Change, Move, and Delete, as the rights allow. */
function Actions(props: {
  value: OrgValue
  rights: ValueRights
  links: ValueLinks
}) {
  const { value, rights, links } = props
  const { name } = value
  const replace =
    value.kind === 'start'
      ? rowActionLabels.change(name)
      : `Replace the description or the value of ${name}`
  return (
    <span className={secrets.actions}>
      {rights.reveal ? (
        <RowAction icon={Eye} label={`Reveal the value of ${name}`} />
      ) : null}
      {rights.change ? (
        <>
          <RowAction
            icon={TextCursorInput}
            label={rowActionLabels.rename(name)}
            to={links.rename}
          />
          <RowAction icon={Pencil} label={replace} />
        </>
      ) : null}
      {rights.move ? (
        <RowAction
          icon={ArrowRightLeft}
          label={rowActionLabels.move(name)}
          to={links.move}
        />
      ) : null}
      {rights.change ? (
        <RowAction icon={Trash2} label={`Delete ${name}`} />
      ) : null}
    </span>
  )
}

/**
 * One value of the combined list: its name, the description of a secret,
 * and its kind, with who added a secret and its last reveal. Then its mark,
 * the hidden value, and the actions that the viewer may take. The Rename
 * form takes the place of the value and the actions.
 */
export function ValueRow(props: {
  value: OrgValue
  access: SecretsAccess
  renaming: boolean
  links: ValueLinks
}) {
  const { value, access } = props
  const rights = valueRights(value, access)
  return (
    <li className={styles.row}>
      <span className={secrets.text}>
        <span className={secrets.name}>{value.name}</span>
        {value.kind === 'approval' ? (
          <span className={secrets.description}>
            {value.secret.description}
          </span>
        ) : null}
        <Meta value={value} viewer={access.person} />
      </span>
      <span className={secrets.markCell}>
        <Mark editable={rights.mark} value={value} />
      </span>
      {props.renaming ? (
        <RenameForm value={value} />
      ) : (
        <>
          <span className={styles.dots}>
            <ValueDots />
          </span>
          <Actions links={props.links} rights={rights} value={value} />
        </>
      )}
    </li>
  )
}

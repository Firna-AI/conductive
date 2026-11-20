import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { OrgValue } from '../../fixtures/orgValues'
import type { MenuEntry } from '../common/Menu'
import { secretRights, type SecretsAccess } from '../secrets/secretRights'
import { secretsWords } from '../secrets/secretsCopy'
import { RowMenuButton, ValueBadge } from './ValueParts'
import { kindWords, menuWords } from './valuesCopy'
import styles from './ValuesTab.module.css'

/** What a person may do with one value. */
type ValueRights = { reveal: boolean; change: boolean }

/**
 * The rights of a value. A secret keeps the rights of secrets decision 3 B.
 * Only an admin changes an env var (decision 57). Edit, which also renames
 * and changes the type, follows the right to change.
 */
export function valueRights(
  value: OrgValue,
  access: SecretsAccess,
): ValueRights {
  if (value.kind === 'secret') {
    const rights = secretRights(value.secret, access)
    return { reveal: rights.reveal, change: rights.change }
  }
  const admin = access.kind === 'admin'
  return { reveal: false, change: admin }
}

/** The items of the menu of a row, as the rights allow. */
export function rowMenu(rights: ValueRights): MenuEntry[] {
  const entries: MenuEntry[] = []
  if (rights.reveal)
    entries.push({ kind: 'item', label: menuWords.reveal, icon: Eye })
  if (rights.change)
    entries.push({ kind: 'item', label: menuWords.edit, icon: Pencil })
  if (rights.change) {
    entries.push({ kind: 'divider' })
    entries.push({
      kind: 'item',
      label: menuWords.delete,
      icon: Trash2,
      tone: 'danger',
    })
  }
  return entries
}

/**
 * One value of the list: its name and its badges on the first line, and
 * the description of a secret on a second line. The "⋯" button holds the
 * actions that the viewer may take. Who added a secret, its last reveal,
 * and its marks show in its Edit modal, so the list stays short.
 */
export function ValueRow(props: {
  value: OrgValue
  access: SecretsAccess
  menuOpen: boolean
}) {
  const { value } = props
  const entries = rowMenu(valueRights(value, props.access))
  const allAgents = value.kind === 'secret' && value.secret.allAgents
  return (
    <li className={styles.row}>
      <span className={styles.text}>
        <span className={styles.head}>
          <span className={styles.name}>{value.name}</span>
          <ValueBadge label={kindWords[value.kind]} />
          {allAgents ? <ValueBadge label={secretsWords.allAgents} /> : null}
        </span>
        {value.kind === 'secret' ? (
          <span className={styles.description}>{value.secret.description}</span>
        ) : null}
      </span>
      {entries.length > 0 ? (
        <RowMenuButton
          entries={entries}
          name={value.name}
          open={props.menuOpen}
        />
      ) : null}
    </li>
  )
}

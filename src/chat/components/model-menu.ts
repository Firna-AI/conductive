import { ExternalLink } from 'lucide-react'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { ShortcutHint } from '../../shell/shortcuts/shortcut-hints'
import type { MenuEntry, MenuRow } from '../ui/Menu'
import type { ModelMenuRow, ModelRow } from './model-rows'

/** The Fast row of the menu: what a change of it does, and its key. */
export interface FastRow {
  /** Turns fast mode on or off. The menu stays open. */
  readonly toggle: () => void
  /** The key of Fast mode, which the row shows at its end, if any. */
  readonly hint?: ShortcutHint
}

/**
 * The entry of one row. A pick of a choice sends its choice through
 * `choose`. A choice that opens a new session ends with the external link
 * icon, and a screen reader says "New session" for it.
 */
function rowEntry(
  row: ModelRow,
  choose: (choice: AgentChoice) => void,
  fast: FastRow,
): MenuRow {
  switch (row.kind) {
    case 'choice':
      return {
        kind: 'item',
        key: row.key,
        label: row.label,
        muted: row.muted,
        trailingIcon: row.opensSession ? ExternalLink : undefined,
        trailingLabel: row.opensSession ? 'New session' : undefined,
        checked: row.checked,
        onSelect: () => choose(row.choice),
      }
    case 'fast':
      return {
        kind: 'switch',
        key: 'fast',
        label: row.label,
        on: row.on,
        onToggle: fast.toggle,
        shortcut: fast.hint,
      }
    case 'label':
    case 'divider':
      return row
  }
}

/**
 * The entries of the menu of the model picker of a session, from the rows
 * of `modelMenuRows`. All models and Effort open their rows in a submenu.
 * The Fast row changes fast mode through `fast`, and the menu stays open.
 */
export function modelMenu(
  rows: readonly ModelMenuRow[],
  choose: (choice: AgentChoice) => void,
  fast: FastRow,
): MenuEntry[] {
  return rows.map((row): MenuEntry => {
    if (row.kind !== 'submenu') return rowEntry(row, choose, fast)
    return {
      kind: 'submenu',
      key: row.key,
      label: row.label,
      muted: row.muted,
      entries: row.rows.map((item) => rowEntry(item, choose, fast)),
    }
  })
}

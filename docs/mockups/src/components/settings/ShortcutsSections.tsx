import {
  recordingCommand,
  refusedShortcut,
  shortcutsOf,
  takenShortcut,
  unsavedChange,
  type ShortcutChanges,
} from '../../fixtures/shortcutChanges'
import {
  browserTabOf,
  keyboardOf,
  type Keyboard,
  type ShortcutHost,
} from '../../fixtures/shortcutHosts'
import {
  commandLabel,
  fixedLabel,
  shortcutGroups,
  type CommandRow,
  type ShortcutGroup,
} from '../../fixtures/shortcuts'
import type { Shortcut } from '../common/KeyChips'
import { SearchField } from '../common/SearchField'
import { NoResults } from '../palette/PaletteEmpty'
import { Section } from './Section'
import { ShortcutIntro } from './ShortcutIntro'
import { shortcutPages, type ShortcutPages } from './shortcutPages'
import {
  CommandShortcuts,
  FixedShortcuts,
  type CommandRowState,
} from './ShortcutRows'
import {
  matchingGroups,
  shortcutQueries,
  type ShortcutSearch,
} from './shortcutSearch'
import styles from './ShortcutsSections.module.css'

/**
 * The change of a shortcut on the tab, in progress or last: none, a row
 * that records new keys, the same row after a fixed shortcut that it did
 * not take, a recorded shortcut of another command, the question before
 * Reset all, or a save that failed.
 */
export const keyChanges = [
  'none',
  'recording',
  'refused',
  'conflict',
  'reset-all',
  'not-saved',
] as const

export type KeyChange = (typeof keyChanges)[number]

/** What the state of each row depends on. */
type RowContext = {
  changes: ShortcutChanges
  change: KeyChange
  keyboard: Keyboard
  pages: ShortcutPages
  /** The fixed shortcut that the recorder did not take, with its label. */
  refused?: { shortcut: Shortcut; label: string }
}

/** The state of the row of a command, from the changes and the last change. */
function rowState(row: CommandRow, context: RowContext): CommandRowState {
  const { changes, change, pages } = context
  const keys = shortcutsOf(row.id, changes, context.keyboard)
  const records = row.id === recordingCommand
  if (records && (change === 'recording' || change === 'refused')) {
    return {
      kind: 'recording',
      keys,
      replaces: keys[0],
      refused: change === 'refused' ? context.refused : undefined,
      cancelTo: pages.tab,
    }
  }
  if (records && change === 'conflict') {
    return {
      kind: 'conflict',
      keys,
      replaces: keys[0],
      shortcut: takenShortcut.shortcut,
      owner: commandLabel(takenShortcut.owner),
      cancelTo: pages.tab,
      replaceTo: pages.changes,
    }
  }
  const unsaved = change === 'not-saved' && row.id === unsavedChange.command
  const unchanged = Object.keys(changes).length === 0
  return {
    kind: 'shortcuts',
    keys,
    changed: changes[row.id] !== undefined,
    unsaved: unsaved ? unsavedChange.shortcut : undefined,
    recordTo:
      records && unchanged && change === 'none' ? pages.recording : undefined,
  }
}

/** The fixed shortcut that the recorder of a host refuses, with its label. */
function refusedOn(host: ShortcutHost): RowContext['refused'] {
  const shortcut = refusedShortcut(host)
  const label = fixedLabel(shortcut, host)
  return label ? { shortcut, label } : undefined
}

/** The line of a group whose every row is fixed, in place of a label on each row. */
const fixedGroupLine = 'These shortcuts are fixed.'

/** Whether every row of a group is a fixed shortcut. */
function allFixed(group: ShortcutGroup): boolean {
  return group.rows.every((row) => row.kind === 'fixed')
}

/**
 * The Keyboard shortcuts tab of the account on a host. It lists each
 * command with its shortcuts on the keyboard of the host, in the groups of
 * Conductor. The search field at the top keeps the rows whose label or
 * words hold each word of the query, as the palette finds its rows, and a
 * group without such a row hides. A press on a shortcut, on +, or on Add
 * shortcut records the next keys, and each change saves at once, as
 * Preferences does. A changed row shows Reset. Reset all asks first, then
 * returns every shortcut of this keyboard to its defaults. A group of fixed
 * shortcuts says so once, under its title. In a normal browser tab, a key
 * that the browser keeps is dimmed, and a line says where it works.
 */
export function ShortcutsTab(props: {
  host: ShortcutHost
  changes: ShortcutChanges
  change: KeyChange
  search: ShortcutSearch
}) {
  const { host } = props
  const changed = Object.keys(props.changes).length > 0
  const query = shortcutQueries[props.search]
  const shown = matchingGroups(query, shortcutGroups(host))
  const pages = shortcutPages[host]
  const tab = browserTabOf(host)
  const context: RowContext = {
    changes: props.changes,
    change: props.change,
    keyboard: keyboardOf(host),
    pages,
    refused: refusedOn(host),
  }
  return (
    <>
      <SearchField
        label="Search shortcuts"
        placeholder="Search shortcuts"
        query={query}
      />
      <ShortcutIntro
        changed={changed}
        host={host}
        resetAllTo={pages.resetAll}
      />
      {shown.length === 0 ? (
        <NoResults
          hint="Try a command name, such as Close tab."
          query={query}
        />
      ) : null}
      {shown.map(({ group, rows }) => (
        <Section
          description={
            group.description ?? (allFixed(group) ? fixedGroupLine : undefined)
          }
          key={group.label}
          title={group.label}
        >
          <ul aria-label={group.label} className={styles.list}>
            {rows.map((row) => (
              <li className={styles.row} key={row.label}>
                {row.kind === 'command' ? (
                  <CommandShortcuts
                    label={row.label}
                    state={rowState(row, context)}
                    tab={tab}
                  />
                ) : (
                  <FixedShortcuts
                    keys={row.keys}
                    label={row.label}
                    note={!allFixed(group)}
                  />
                )}
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  )
}

import { RotateCcw } from 'lucide-react'
import {
  recordingCommand,
  refusedShortcut,
  shortcutsOf,
  takenShortcut,
  unsavedChange,
  type ShortcutChanges,
} from '../../fixtures/shortcutChanges'
import {
  commandLabel,
  fixedLabel,
  shortcutGroups,
  type CommandRow,
  type ShortcutGroup,
} from '../../fixtures/shortcuts'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { KeyChips } from '../common/KeyChips'
import { ScreenLink } from '../common/ScreenLink'
import { SearchField } from '../common/SearchField'
import { NoResults } from '../palette/PaletteEmpty'
import {
  CommandShortcuts,
  FixedShortcuts,
  type CommandRowState,
} from './ShortcutRows'
import { Section } from './Section'
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

/** The state of the row of a command, from the changes and the last change. */
function rowState(
  row: CommandRow,
  changes: ShortcutChanges,
  change: KeyChange,
): CommandRowState {
  const keys = shortcutsOf(row.id, changes)
  const records = row.id === recordingCommand
  if (records && (change === 'recording' || change === 'refused')) {
    const label = change === 'refused' ? fixedLabel(refusedShortcut) : undefined
    return {
      kind: 'recording',
      keys,
      replaces: keys[0],
      refused: label ? { shortcut: refusedShortcut, label } : undefined,
      cancelTo: paths.macShortcuts,
    }
  }
  if (records && change === 'conflict') {
    return {
      kind: 'conflict',
      keys,
      replaces: keys[0],
      shortcut: takenShortcut.shortcut,
      owner: commandLabel(takenShortcut.owner),
      cancelTo: paths.macShortcuts,
      replaceTo: paths.macShortcutsChanges,
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
      records && unchanged && change === 'none'
        ? paths.macShortcutsRecording
        : undefined,
  }
}

/** The line of a group whose every row is fixed, in place of a label on each row. */
const fixedGroupLine = 'These shortcuts are fixed.'

/** Whether every row of a group is a fixed shortcut. */
function allFixed(group: ShortcutGroup): boolean {
  return group.rows.every((row) => row.kind === 'fixed')
}

/**
 * The lines above the groups: how to change a shortcut, and the keys that
 * the terminal keeps while it has the focus. Reset all follows them after a
 * change.
 */
function Intro(props: { changed: boolean }) {
  return (
    <div className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.introLine}>Select a shortcut to change it.</p>
        <p className={styles.introLine}>
          Keys without <KeyChips shortcut="⌘" /> go to the terminal while it has
          the focus.
        </p>
      </div>
      {props.changed ? (
        <ScreenLink asChild to={paths.macShortcutsResetAll}>
          <ActionButton
            accessibilityLabel="Reset all shortcuts"
            icon={RotateCcw}
          >
            Reset all
          </ActionButton>
        </ScreenLink>
      ) : null}
    </div>
  )
}

/**
 * The Keyboard shortcuts tab of the account. It lists each command with
 * its shortcuts, in the groups of Conductor. The search field at the top
 * keeps the rows whose label or words hold each word of the query, as the
 * palette finds its rows, and a group without such a row hides. A press on
 * a shortcut, on +, or on Add shortcut records the next keys, and each
 * change saves at once, as Preferences does. A changed row shows Reset.
 * Reset all asks first, then returns every shortcut of this keyboard to its
 * defaults. A group of fixed shortcuts says so once, under its title.
 */
export function ShortcutsTab(props: {
  changes: ShortcutChanges
  change: KeyChange
  search: ShortcutSearch
}) {
  const changed = Object.keys(props.changes).length > 0
  const query = shortcutQueries[props.search]
  const shown = matchingGroups(query, shortcutGroups)
  return (
    <>
      <SearchField
        label="Search shortcuts"
        placeholder="Search shortcuts"
        query={query}
      />
      <Intro changed={changed} />
      {shown.length === 0 ? (
        <NoResults
          hint="Try a command name, such as Close tab."
          query={query}
        />
      ) : null}
      {shown.map(({ group, rows }) => (
        <Section
          description={allFixed(group) ? fixedGroupLine : group.description}
          key={group.label}
          title={group.label}
        >
          <ul aria-label={group.label} className={styles.list}>
            {rows.map((row) => (
              <li className={styles.row} key={row.label}>
                {row.kind === 'command' ? (
                  <CommandShortcuts
                    label={row.label}
                    state={rowState(row, props.changes, props.change)}
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

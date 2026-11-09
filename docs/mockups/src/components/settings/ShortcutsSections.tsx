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
import { ScreenLink } from '../common/ScreenLink'
import {
  CommandShortcuts,
  FixedShortcuts,
  type CommandRowState,
} from './ShortcutRows'
import { Section } from './Section'
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
 * The Keyboard shortcuts tab of the account (decision 190). It lists each
 * command with its shortcuts, in the groups of Conductor. A press on a
 * shortcut, on +, or on Add shortcut records the next keys, and each change
 * saves at once, as Preferences does. A changed row shows Reset. Reset all
 * asks first, then returns every shortcut of this keyboard to its defaults.
 * A group of fixed shortcuts says so once, under its title. Only the Mac
 * app shows the tab until decisions 192 and 194 set the keys of a browser.
 */
export function ShortcutsTab(props: {
  changes: ShortcutChanges
  change: KeyChange
}) {
  const changed = Object.keys(props.changes).length > 0
  return (
    <>
      <div className={styles.intro}>
        <p className={styles.introText}>Select a shortcut to change it.</p>
        {changed ? (
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
      {shortcutGroups.map((group) => (
        <Section
          description={allFixed(group) ? fixedGroupLine : group.description}
          key={group.label}
          title={group.label}
        >
          <ul aria-label={group.label} className={styles.list}>
            {group.rows.map((row) => (
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

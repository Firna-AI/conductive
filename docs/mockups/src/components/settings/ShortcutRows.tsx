import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { BrowserTab } from '../../fixtures/shortcutHosts'
import { shortcutLimit } from '../../fixtures/shortcuts'
import { ActionButton, IconButton } from '../common/actions'
import { KeyChips, type Shortcut } from '../common/KeyChips'
import {
  CancelButton,
  ConflictActions,
  ConflictLine,
  KeyButton,
  Linked,
  Recorder,
  RemoveButton,
  RowLayout,
  RowMessage,
} from './ShortcutParts'
import styles from './ShortcutsSections.module.css'

/**
 * The state of the row of a command. A row shows its shortcuts, with Reset
 * after a change, and with the shortcut that a failed save did not keep.
 * While the row records, the recorder takes the place of the pressed
 * shortcut, and Remove can take that shortcut off. The recorder names a
 * fixed shortcut that it did not take, or the command that already has the
 * recorded shortcut. After Reset, the row names the command that holds a
 * default shortcut of the row. A link is missing where the catalogue draws
 * no page for it.
 */
export type CommandRowState =
  | {
      kind: 'shortcuts'
      keys: readonly Shortcut[]
      changed: boolean
      /** A recorded shortcut that the app did not save. */
      unsaved?: Shortcut
      /** The page that a press on the first shortcut opens. */
      recordTo?: string
      /** The page that a press on + opens. */
      addTo?: string
    }
  | {
      kind: 'recording'
      keys: readonly Shortcut[]
      /** The pressed shortcut, which Remove takes off. None after Add. */
      replaces?: Shortcut
      /** The last fixed shortcut that the recorder did not take. */
      refused?: { shortcut: Shortcut; label: string }
      cancelTo: string
    }
  | {
      kind: 'conflict'
      keys: readonly Shortcut[]
      replaces?: Shortcut
      shortcut: Shortcut
      owner: string
      cancelTo: string
      replaceTo?: string
    }
  | {
      kind: 'reset-conflict'
      /** The default shortcuts that Reset gives the command. */
      keys: readonly Shortcut[]
      /** The default shortcut that another command holds now. */
      shortcut: Shortcut
      owner: string
      cancelTo: string
      replaceTo?: string
    }

/**
 * A fixed shortcut: its keys, with no control. `note` adds the words Fixed
 * shortcut, for a fixed row among commands that a person can change.
 */
export function FixedShortcuts(props: {
  label: string
  keys: readonly Shortcut[]
  note: boolean
}) {
  return (
    <RowLayout
      keys={props.keys.map((shortcut) => (
        <span className={styles.still} key={shortcut}>
          <KeyChips shortcut={shortcut} />
        </span>
      ))}
      label={props.label}
      note={
        props.note ? (
          <span className={styles.fixed}>Fixed shortcut</span>
        ) : undefined
      }
    />
  )
}

/** The browser that keeps a shortcut in a normal tab, or none. */
function keeper(shortcut: Shortcut, tab?: BrowserTab) {
  return tab?.kept.has(shortcut) ? tab.browser : undefined
}

/**
 * The shortcuts of a row that records: the recorder takes the place of the
 * pressed shortcut, or follows the others after a press on Add.
 */
function recordingKeys(
  label: string,
  state: { keys: readonly Shortcut[]; replaces?: Shortcut },
  tab?: BrowserTab,
  recorded?: Shortcut,
): ReactNode[] {
  const recorder = <Recorder key="recorder" shortcut={recorded} />
  const others = state.keys.map((shortcut) =>
    shortcut === state.replaces ? (
      recorder
    ) : (
      <KeyButton
        key={shortcut}
        keptBy={keeper(shortcut, tab)}
        label={label}
        shortcut={shortcut}
      />
    ),
  )
  return state.replaces === undefined ? [...others, recorder] : others
}

/**
 * The default shortcuts that Reset would give a row. The shortcut that
 * another command holds waits in the field of the recorder, as a recorded
 * shortcut does. The others show without a control until the answer.
 */
function resetKeys(
  state: { keys: readonly Shortcut[]; shortcut: Shortcut },
  tab?: BrowserTab,
): ReactNode[] {
  return state.keys.map((shortcut) =>
    shortcut === state.shortcut ? (
      <Recorder key={shortcut} shortcut={shortcut} />
    ) : (
      <span className={styles.still} key={shortcut}>
        <KeyChips
          dimmed={keeper(shortcut, tab) !== undefined}
          shortcut={shortcut}
        />
      </span>
    ),
  )
}

/**
 * The row of a command that a person can change, in its state. In a normal
 * browser tab, `tab` names the browser and the keys that it keeps, which
 * the row dims.
 */
export function CommandShortcuts(props: {
  label: string
  state: CommandRowState
  tab?: BrowserTab
}) {
  const { label, state, tab } = props
  switch (state.kind) {
    case 'recording':
      return (
        <RowLayout
          end={
            <>
              {state.replaces ? (
                <RemoveButton label={label} shortcut={state.replaces} />
              ) : null}
              <CancelButton to={state.cancelTo} />
            </>
          }
          keys={recordingKeys(label, state, tab)}
          label={label}
          message={
            state.refused ? (
              <RowMessage tone="info">
                {state.refused.label} always uses{' '}
                <KeyChips shortcut={state.refused.shortcut} />.
              </RowMessage>
            ) : undefined
          }
        />
      )
    case 'conflict':
      return (
        <RowLayout
          end={<ConflictActions held={state} label={label} />}
          keys={recordingKeys(label, state, tab, state.shortcut)}
          label={label}
          message={<ConflictLine held={state} />}
        />
      )
    case 'reset-conflict':
      return (
        <RowLayout
          end={<ConflictActions held={state} label={label} />}
          keys={resetKeys(state, tab)}
          label={label}
          message={<ConflictLine held={state} />}
        />
      )
    case 'shortcuts':
      return <ShortcutsLine label={label} state={state} tab={tab} />
  }
}

/** A row that shows its shortcuts, Add, and Reset after a change. */
function ShortcutsLine(props: {
  label: string
  state: Extract<CommandRowState, { kind: 'shortcuts' }>
  tab?: BrowserTab
}) {
  const { label, state } = props
  const count = state.keys.length
  return (
    <RowLayout
      end={
        count > 0 && count < shortcutLimit ? (
          <Linked to={state.addTo}>
            <IconButton icon={Plus} label={`Add shortcut for ${label}`} quiet />
          </Linked>
        ) : undefined
      }
      keys={
        count === 0 ? (
          <ActionButton
            accessibilityLabel={`Add shortcut for ${label}`}
            icon={Plus}
            tone="plain"
          >
            Add shortcut
          </ActionButton>
        ) : (
          state.keys.map((shortcut, index) => (
            <KeyButton
              key={shortcut}
              keptBy={keeper(shortcut, props.tab)}
              label={label}
              shortcut={shortcut}
              to={index === 0 ? state.recordTo : undefined}
            />
          ))
        )
      }
      label={label}
      message={
        state.unsaved ? (
          <RowMessage tone="danger">
            <KeyChips shortcut={state.unsaved} /> wasn't saved. Try again.
          </RowMessage>
        ) : undefined
      }
      note={
        state.changed ? (
          <ActionButton accessibilityLabel={`Reset ${label}`} tone="plain">
            Reset
          </ActionButton>
        ) : undefined
      }
    />
  )
}

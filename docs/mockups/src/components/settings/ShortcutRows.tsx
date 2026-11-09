import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { shortcutLimit } from '../../fixtures/shortcuts'
import { ActionButton, IconButton } from '../common/actions'
import { KeyChips, spokenShortcut, type Shortcut } from '../common/KeyChips'
import { ScreenLink } from '../common/ScreenLink'
import { KeyButton, Recorder, RowLayout, RowMessage } from './ShortcutParts'
import styles from './ShortcutsSections.module.css'

/**
 * The state of the row of a command. A row shows its shortcuts, with Reset
 * after a change, and with the shortcut that a failed save did not keep.
 * While the row records, the recorder takes the place of the pressed
 * shortcut. It names a fixed shortcut that it did not take, or the command
 * that already has the recorded shortcut.
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
    }
  | {
      kind: 'recording'
      keys: readonly Shortcut[]
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
      replaceTo: string
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

/**
 * The shortcuts of a row that records: the recorder takes the place of the
 * pressed shortcut, or follows the others after a press on Add.
 */
function recordingKeys(
  label: string,
  state: { keys: readonly Shortcut[]; replaces?: Shortcut },
  recorded?: Shortcut,
): ReactNode[] {
  const recorder = <Recorder key="recorder" shortcut={recorded} />
  const others = state.keys.map((shortcut) =>
    shortcut === state.replaces ? (
      recorder
    ) : (
      <KeyButton key={shortcut} label={label} shortcut={shortcut} />
    ),
  )
  return state.replaces === undefined ? [...others, recorder] : others
}

/** The row of a command that a person can change, in its state. */
export function CommandShortcuts(props: {
  label: string
  state: CommandRowState
}) {
  const { label, state } = props
  const cancel = (to: string) => (
    <ScreenLink asChild to={to}>
      <ActionButton tone="plain">Cancel</ActionButton>
    </ScreenLink>
  )
  switch (state.kind) {
    case 'recording':
      return (
        <RowLayout
          end={cancel(state.cancelTo)}
          keys={recordingKeys(label, state)}
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
          end={
            <>
              <ScreenLink asChild to={state.replaceTo}>
                <ActionButton
                  accessibilityLabel={`Replace: move ${spokenShortcut(state.shortcut)} from ${state.owner} to ${label}`}
                >
                  Replace
                </ActionButton>
              </ScreenLink>
              {cancel(state.cancelTo)}
            </>
          }
          keys={recordingKeys(label, state, state.shortcut)}
          label={label}
          message={
            <RowMessage tone="warning">
              {state.owner} uses <KeyChips shortcut={state.shortcut} />.
            </RowMessage>
          }
        />
      )
    case 'shortcuts':
      return <ShortcutsLine label={label} state={state} />
  }
}

/** A row that shows its shortcuts, Add, and Reset after a change. */
function ShortcutsLine(props: {
  label: string
  state: Extract<CommandRowState, { kind: 'shortcuts' }>
}) {
  const { label, state } = props
  const count = state.keys.length
  return (
    <RowLayout
      end={
        count > 0 && count < shortcutLimit ? (
          <IconButton icon={Plus} label={`Add shortcut for ${label}`} quiet />
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

import type { BrowserTab } from '../../fixtures/shortcutHosts'
import { shortcutLimit } from '../../fixtures/shortcuts'
import {
  actionButton,
  iconButton,
} from '../../entries/components/common/actions.mockup'
import type { Shortcut } from '../../../../../src/ui/components/common/KeyChips'
import { keyChips } from '../../entries/components/common/KeyChips.mockup'
import { Linked } from '../common/ScreenLink'
import {
  cancelButton,
  conflictActions,
  conflictLine,
  refusedLine,
  removeButton,
  rowLayout,
  rowMessage,
} from '../../entries/components/settings/ShortcutParts.mockup'
import { type HeldShortcut, type RefusedShortcut } from './ShortcutParts'
import { keyOf, recordingKeys, resetKeys } from './shortcutRowKeys'
import { instanceKey, shortcutKey } from '../../instanceKey'
import { defined } from '../../defined'
import styles from '../../../../../src/ui/components/settings/ShortcutsSections.module.css'

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
      refused?: RefusedShortcut
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
    <rowLayout.Component
      keys={props.keys.map((shortcut, index) => (
        <span className={styles.still} key={index}>
          <keyChips.Component
            moklyInstance={`${instanceKey(props.label)}-${shortcutKey(shortcut)}`}
            shortcut={shortcut}
          />
        </span>
      ))}
      label={props.label}
      moklyInstance="row"
      {...defined({
        note: props.note ? (
          <span className={styles.fixed}>Fixed shortcut</span>
        ) : undefined,
      })}
    />
  )
}

/**
 * The shortcut that another command holds, from the state of a row, with
 * only the fields of `HeldShortcut`, as the data of a Mokly part.
 */
function heldOf(state: HeldShortcut): HeldShortcut {
  const { shortcut, owner, cancelTo, replaceTo } = state
  return { shortcut, owner, cancelTo, ...defined({ replaceTo }) }
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
        <rowLayout.Component
          end={
            <>
              {state.replaces ? (
                <removeButton.Component
                  label={label}
                  moklyInstance="remove"
                  shortcut={state.replaces}
                />
              ) : null}
              <cancelButton.Component
                moklyInstance="cancel"
                to={state.cancelTo}
              />
            </>
          }
          keys={recordingKeys(label, state, tab)}
          label={label}
          moklyInstance="row"
          {...defined({
            message: state.refused ? (
              <refusedLine.Component
                moklyInstance="refused"
                refused={state.refused}
              />
            ) : undefined,
          })}
        />
      )
    case 'conflict':
    case 'reset-conflict':
      return (
        <rowLayout.Component
          end={
            <conflictActions.Component
              held={heldOf(state)}
              label={label}
              moklyInstance="conflict-actions"
            />
          }
          keys={
            state.kind === 'conflict'
              ? recordingKeys(label, state, tab, state.shortcut)
              : resetKeys(label, state, tab)
          }
          label={label}
          message={
            <conflictLine.Component
              held={heldOf(state)}
              moklyInstance="conflict-line"
            />
          }
          moklyInstance="row"
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
    <rowLayout.Component
      keys={
        count === 0 ? (
          <actionButton.Component
            accessibilityLabel={`Add shortcut for ${label}`}
            icon="plus"
            moklyInstance={`add-${instanceKey(label)}`}
            tone="plain"
          >
            Add shortcut
          </actionButton.Component>
        ) : (
          state.keys.map((shortcut, index) =>
            keyOf(
              label,
              shortcut,
              props.tab,
              index === 0 ? state.recordTo : undefined,
            ),
          )
        )
      }
      label={label}
      moklyInstance="row"
      {...defined({
        end:
          count > 0 && count < shortcutLimit ? (
            <Linked to={state.addTo}>
              <iconButton.Component
                icon="plus"
                label={`Add shortcut for ${label}`}
                moklyInstance={`add-${instanceKey(label)}`}
                quiet
              />
            </Linked>
          ) : undefined,
        message: state.unsaved ? (
          <rowMessage.Component moklyInstance="unsaved" tone="danger">
            <keyChips.Component
              moklyInstance={`unsaved-${instanceKey(label)}`}
              shortcut={state.unsaved}
            />{' '}
            wasn't saved. Try again.
          </rowMessage.Component>
        ) : undefined,
        note: state.changed ? (
          <actionButton.Component
            accessibilityLabel={`Reset ${label}`}
            moklyInstance={`reset-${instanceKey(label)}`}
            tone="plain"
          >
            Reset
          </actionButton.Component>
        ) : undefined,
      })}
    />
  )
}

import type { ReactNode } from 'react'
import type { BrowserTab } from '../../fixtures/shortcutHosts'
import {
  sameShortcut,
  type Shortcut,
} from '../../../../../src/ui/components/common/KeyChips'
import { keyChips } from '../../entries/components/common/KeyChips.mockup'
import {
  keyButton,
  recorder as recorderPart,
} from '../../entries/components/settings/ShortcutParts.mockup'
import { instanceKey, shortcutKey } from '../../instanceKey'
import { defined } from '../../defined'
import styles from '../../../../../src/ui/components/settings/ShortcutsSections.module.css'

/** The browser that keeps a shortcut in a normal tab, or none. */
function keeper(shortcut: Shortcut, tab?: BrowserTab) {
  return tab?.kept.some((key) => sameShortcut(key, shortcut))
    ? tab.browser
    : undefined
}

/** A shortcut of a row, as a button that records new keys. */
export function keyOf(
  label: string,
  shortcut: Shortcut,
  tab?: BrowserTab,
  to?: string,
) {
  return (
    <keyButton.Component
      key={shortcutKey(shortcut)}
      label={label}
      moklyInstance={`key-${shortcutKey(shortcut)}`}
      shortcut={shortcut}
      {...defined({ keptBy: keeper(shortcut, tab), to })}
    />
  )
}

/**
 * The shortcuts of a row that records: the recorder takes the place of the
 * pressed shortcut, or follows the others after a press on Add.
 */
export function recordingKeys(
  label: string,
  state: { keys: readonly Shortcut[]; replaces?: Shortcut },
  tab?: BrowserTab,
  recorded?: Shortcut,
): ReactNode[] {
  const recorder = (
    <recorderPart.Component
      key="recorder"
      moklyInstance="recorder"
      {...defined({ shortcut: recorded })}
    />
  )
  const { replaces } = state
  const others = state.keys.map((shortcut) =>
    replaces !== undefined && sameShortcut(shortcut, replaces)
      ? recorder
      : keyOf(label, shortcut, tab),
  )
  return replaces === undefined ? [...others, recorder] : others
}

/**
 * The default shortcuts that Reset would give a row. The shortcut that
 * another command holds waits in the field of the recorder, as a recorded
 * shortcut does. The others show without a control until the answer.
 */
export function resetKeys(
  label: string,
  state: { keys: readonly Shortcut[]; shortcut: Shortcut },
  tab?: BrowserTab,
): ReactNode[] {
  return state.keys.map((shortcut, index) =>
    sameShortcut(shortcut, state.shortcut) ? (
      <recorderPart.Component
        key={index}
        moklyInstance="recorder"
        shortcut={shortcut}
      />
    ) : (
      <span className={styles.still} key={index}>
        <keyChips.Component
          dimmed={keeper(shortcut, tab) !== undefined}
          moklyInstance={`${instanceKey(label)}-${shortcutKey(shortcut)}`}
          shortcut={shortcut}
        />
      </span>
    ),
  )
}

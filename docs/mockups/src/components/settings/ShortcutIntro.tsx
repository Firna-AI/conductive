import { RotateCcw } from 'lucide-react'
import { productName } from '../../brand'
import {
  browserTabOf,
  keyboardOf,
  type BrowserTab,
  type Keyboard,
  type ShortcutHost,
} from '../../fixtures/shortcutHosts'
import { ActionButton } from '../common/actions'
import { KeyChips } from '../common/KeyChips'
import { ScreenLink } from '../common/ScreenLink'
import { RowMessage } from './ShortcutParts'
import styles from './ShortcutsSections.module.css'

/**
 * The keys that the terminal keeps while it has the focus, from the user
 * requirement of 10 November 2026: every key without ⌘ on a Mac, and every
 * key with Ctrl or Alt on Windows.
 */
function TerminalLine(props: { keyboard: Keyboard }) {
  if (props.keyboard === 'mac') {
    return (
      <p className={styles.introLine}>
        Keys without <KeyChips shortcut="⌘" /> go to the terminal while it has
        the focus.
      </p>
    )
  }
  return (
    <p className={styles.introLine}>
      Keys with <KeyChips shortcut="Ctrl" /> or <KeyChips shortcut="Alt" /> go
      to the terminal while it has the focus.
    </p>
  )
}

/**
 * Where the dimmed keys of a normal browser tab work: in the Mac app on a
 * Mac, and in the app that Chrome or Edge installs. Firefox installs no app
 * on a Mac, and its web apps on Windows keep the keys of a tab, so there
 * the line names the browsers that install the app.
 */
function keptKeysLine(keyboard: Keyboard, tab: BrowserTab): string {
  const places = [
    keyboard === 'mac' ? 'the Mac app' : undefined,
    tab.installs ? `${productName} installed from ${tab.browser}` : undefined,
  ].filter((place) => place !== undefined)
  if (places.length === 0) {
    return `Dimmed keys work in ${productName} installed from Chrome or Edge.`
  }
  return `Dimmed keys work in ${places.join(' or in ')}.`
}

/**
 * The lines above the groups: how to change a shortcut, the keys that the
 * terminal keeps, and in a normal browser tab, where the dimmed keys work.
 * Reset all follows them after a change. The error of a failed Reset all
 * stands under them, across the width of the tab.
 */
export function ShortcutIntro(props: {
  host: ShortcutHost
  changed: boolean
  /** The save of Reset all failed, so the changes stay. */
  resetAllFailed?: boolean
  /** The question before Reset all, when the catalogue draws it. */
  resetAllTo?: string
}) {
  const keyboard = keyboardOf(props.host)
  const tab = browserTabOf(props.host)
  const resetAll = (
    <ActionButton accessibilityLabel="Reset all shortcuts" icon={RotateCcw}>
      Reset all
    </ActionButton>
  )
  return (
    <div className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.introLine}>Select a shortcut to change it.</p>
        <TerminalLine keyboard={keyboard} />
        {tab ? (
          <p className={styles.introLine}>{keptKeysLine(keyboard, tab)}</p>
        ) : null}
      </div>
      {props.changed && props.resetAllTo ? (
        <ScreenLink asChild to={props.resetAllTo}>
          {resetAll}
        </ScreenLink>
      ) : null}
      {props.changed && !props.resetAllTo ? resetAll : null}
      {props.resetAllFailed ? (
        <div className={styles.introError}>
          <RowMessage tone="danger">
            The shortcuts weren't reset. Try again.
          </RowMessage>
        </div>
      ) : null}
    </div>
  )
}

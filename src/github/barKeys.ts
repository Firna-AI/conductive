import {
  agentActionCommand,
  agentActionLabels,
  barLabels,
  mergeLabels,
} from '../../docs/mockups/src/components/workspace/barCopy'
import type { BarAction } from '../../docs/mockups/src/components/workspace/barModel'
import type { ShortcutCommandId } from '../shared/shortcut-commands'
import type { CommandKey } from './ActionButton'
import type { BarControls } from './barView'

/**
 * Gives the key of the command of a control, for the label that the
 * control shows: its tooltip and its name for a screen reader, or none
 * while the command has no key that works here, such as in the phone
 * layout. The app gives it, so these parts read no keymap.
 */
export type CommandKeyOf = (
  command: ShortcutCommandId,
  label: string,
) => CommandKey | undefined

/** A command that the bar runs now, with what its key does. */
export interface BarCommand {
  readonly command: ShortcutCommandId
  readonly run: () => void
}

/** The command whose key does what a click on the button does. */
function commandOf(action: BarAction): ShortcutCommandId {
  switch (action.kind) {
    case 'agent':
      return agentActionCommand(action.action)
    case 'merge':
      return 'merge-pull-request'
    case 'continue':
      return 'continue-after-merge'
    case 'archive':
      return 'archive-workspace'
  }
}

/**
 * Whether the button takes a click now. A busy button, such as Merge while
 * it merges, and a disabled one, such as Continue while a turn runs, take
 * none, so their keys do nothing and their tooltips name no key.
 */
function takesClick(action: BarAction): boolean {
  switch (action.kind) {
    case 'agent':
      return true
    case 'merge':
      return !action.busy
    case 'continue':
      return !action.busy && !action.waiting
    case 'archive':
      return !action.busy && !action.disabled
  }
}

/** The label of a button while it takes a click. */
function idleLabel(action: BarAction): string {
  switch (action.kind) {
    case 'agent':
      return agentActionLabels[action.action]
    case 'merge':
      return mergeLabels[action.method]
    case 'continue':
      return barLabels.continue
    case 'archive':
      return barLabels.archive
  }
}

/**
 * The tooltip and the key name of a button that takes a click, such as
 * "Create PR (⇧⌘P)", or none for a busy or disabled button.
 */
export function buttonKey(
  action: BarAction,
  keyOf: CommandKeyOf | undefined,
): CommandKey | undefined {
  if (!takesClick(action)) return undefined
  return keyOf?.(commandOf(action), idleLabel(action))
}

/**
 * The commands that the keys run while the bar shows: the command of each
 * button that takes a click, which runs what its click runs, so Merge PR
 * merges at once, and Open PR on GitHub while the bar links the pull
 * request: its number on desktop, and Open on GitHub on a phone. `open`
 * opens an address in a new tab, as such a link does.
 */
export function barCommands(
  controls: BarControls,
  open: (url: string) => void,
): BarCommand[] {
  const { view, onAction } = controls
  const buttons = view.actions.filter(takesClick).map((action): BarCommand => ({
    command: commandOf(action),
    run: () => onAction(action),
  }))
  const { link } = view
  if (!link) return buttons
  return [
    ...buttons,
    { command: 'open-pull-request', run: () => open(link.href) },
  ]
}

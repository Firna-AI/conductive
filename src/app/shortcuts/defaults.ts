import {
  shortcutDigits,
  type ShortcutCommandId,
} from '../../shared/shortcut-commands'
import {
  readShortcutKeyText,
  type ShortcutKeyboard,
  type ShortcutKeyText,
} from '../../shared/shortcut-key'
import type { ShortcutHost } from './host'
import { shortcutCommands } from './commands'

type NumberedId =
  | `org-${(typeof shortcutDigits)[number]}`
  | `workspace-${(typeof shortcutDigits)[number]}`
type PlainId = Exclude<ShortcutCommandId, NumberedId>
type Defaults = Readonly<Record<ShortcutKeyboard, readonly string[]>>

const defaults: Readonly<Record<PlainId, Defaults>> = {
  'command-palette': { mac: ['Meta+K'], other: ['Ctrl+K'] },
  'keyboard-shortcuts': { mac: ['Alt+Meta+/'], other: ['Alt+Shift+/'] },
  'account-page': { mac: ['Meta+,'], other: ['Ctrl+,'] },
  'create-org': { mac: [], other: [] },
  'send-feedback': { mac: ['Alt+Meta+F'], other: ['Alt+Shift+F'] },
  'toggle-sidebar': { mac: ['Meta+B', '['], other: [] },
  'toggle-right-column': {
    mac: ['Alt+Meta+B', ']'],
    other: ['Alt+Shift+B', ']'],
  },
  back: { mac: ['Meta+['], other: [] },
  forward: { mac: ['Meta+]'], other: [] },
  'workspace-list': { mac: ['Shift+Meta+H'], other: ['Ctrl+Shift+H'] },
  'previous-tab': {
    mac: ['Ctrl+Shift+Tab', 'Shift+Meta+[', 'Alt+Meta+ArrowLeft', 'Alt+Meta+['],
    other: [
      'Ctrl+Shift+Tab',
      'Ctrl+Shift+[',
      'Alt+Shift+ArrowLeft',
      'Alt+Shift+[',
    ],
  },
  'next-tab': {
    mac: ['Ctrl+Tab', 'Shift+Meta+]', 'Alt+Meta+ArrowRight', 'Alt+Meta+]'],
    other: ['Ctrl+Tab', 'Ctrl+Shift+]', 'Alt+Shift+ArrowRight', 'Alt+Shift+]'],
  },
  'close-tab': {
    mac: ['Meta+W', 'Alt+Meta+W'],
    other: ['Ctrl+W', 'Alt+Shift+W'],
  },
  'reopen-session': {
    mac: ['Shift+Meta+T', 'Alt+Shift+Meta+T'],
    other: ['Ctrl+Shift+T', 'Alt+Shift+Z'],
  },
  'repositories-settings': { mac: ['Alt+Meta+A'], other: ['Alt+Shift+A'] },
  'new-workspace': {
    mac: ['Meta+N', 'Alt+Meta+N'],
    other: ['Ctrl+N', 'Alt+Shift+N'],
  },
  'new-section': { mac: [], other: [] },
  'archive-workspace': { mac: ['Shift+Meta+A'], other: ['Ctrl+Shift+A'] },
  'restore-workspace': { mac: [], other: [] },
  'copy-link': { mac: ['Shift+Meta+C'], other: ['Ctrl+Shift+C'] },
  'previous-workspace': {
    mac: ['Alt+Meta+ArrowUp', 'Ctrl+Meta+ArrowUp'],
    other: ['Alt+Shift+ArrowUp', 'Alt+Shift+PageUp'],
  },
  'next-workspace': {
    mac: ['Alt+Meta+ArrowDown', 'Ctrl+Meta+ArrowDown'],
    other: ['Alt+Shift+ArrowDown', 'Alt+Shift+PageDown'],
  },
  'next-needs-input': { mac: ['Alt+Meta+L'], other: ['Alt+Shift+L'] },
  'create-pull-request': {
    mac: ['Shift+Meta+P', 'Alt+Shift+Meta+P'],
    other: ['Ctrl+Shift+P', 'Alt+Shift+P'],
  },
  'fix-checks': { mac: ['Alt+Meta+X'], other: ['Alt+Shift+X'] },
  'resolve-conflicts': { mac: [], other: [] },
  'address-review': { mac: [], other: [] },
  'commit-and-push': { mac: ['Shift+Meta+Y'], other: ['Ctrl+Shift+Y'] },
  'merge-pull-request': { mac: ['Shift+Meta+M'], other: ['Ctrl+Shift+M'] },
  'continue-after-merge': { mac: [], other: [] },
  'open-pull-request': { mac: ['Shift+Meta+G'], other: ['Ctrl+Shift+G'] },
  'go-to-all-files': { mac: [], other: [] },
  'go-to-changes': { mac: ['Alt+Meta+U'], other: ['Alt+Shift+U'] },
  'go-to-checks': { mac: [], other: [] },
  'go-to-terminal': { mac: ['Meta+J'], other: ['Ctrl+J'] },
  'go-to-preview': { mac: [], other: [] },
  'new-session': {
    mac: ['Meta+T', 'Alt+Meta+T'],
    other: ['Ctrl+T', 'Alt+Shift+T'],
  },
  'session-history': { mac: [], other: [] },
  'focus-message': {
    mac: ['Meta+L', 'Shift+Meta+L'],
    other: ['Ctrl+L', 'Ctrl+Shift+L'],
  },
  'attach-files': { mac: ['Meta+U'], other: ['Ctrl+U'] },
  'model-picker': { mac: ['Meta+/'], other: ['Alt+Shift+M'] },
  'next-effort': { mac: ['Ctrl+Meta+/'], other: ['Ctrl+Shift+/'] },
  'fast-mode': { mac: ['Shift+Meta+E'], other: ['Ctrl+Shift+E'] },
  'stop-agent': { mac: ['Ctrl+Meta+Backspace'], other: ['Alt+Shift+S'] },
  'copy-concise-transcript': { mac: ['Alt+Meta+C'], other: ['Alt+Shift+C'] },
  'copy-full-transcript': { mac: [], other: [] },
}

/** Includes kept keys, so a saved override has the same meaning in every host. */
export function defaultShortcutKeys(
  id: ShortcutCommandId,
  keyboard: ShortcutKeyboard,
): readonly ShortcutKeyText[] {
  for (const digit of shortcutDigits) {
    if (id === `org-${digit}`)
      return [
        readShortcutKeyText(`${keyboard === 'mac' ? 'Ctrl' : 'Alt'}+${digit}`),
      ]
    if (id === `workspace-${digit}`)
      return (
        keyboard === 'mac'
          ? [`Meta+${digit}`, `Alt+Meta+${digit}`]
          : [`Ctrl+${digit}`, `Alt+Shift+${digit}`]
      ).map(readShortcutKeyText)
  }
  const entry = Object.entries(defaults).find(([command]) => command === id)
  return (entry?.[1][keyboard] ?? []).map(readShortcutKeyText)
}

/** Back, Forward, and the sidebar toggle belong only to the Mac app. */
export function commandInHost(
  id: ShortcutCommandId,
  host: ShortcutHost,
): boolean {
  return (
    host.kind === 'mac-app' ||
    shortcutCommands.find((command) => command.id === id)?.only !== 'mac-app'
  )
}

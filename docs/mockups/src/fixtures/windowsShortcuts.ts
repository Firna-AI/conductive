import type { Shortcut } from '../components/common/KeyChips'
import type { CommandId } from './shortcutCommands'

/**
 * The default keys of each command on the keyboard of Windows and Linux,
 * from decision 194 A: Ctrl for ⌘, Shift stays, Alt+Shift with the same key
 * for a Mac key with ⌥ and for each second key, and Alt+1 to Alt+9 for the
 * orgs. The key research of 10 November 2026 chose the keys of the clashes
 * and of the checks that failed: Alt+Shift+Z, Ctrl+Shift+L, Alt+Shift+S,
 * Alt+Shift+M, and Alt+Shift+PgUp and Alt+Shift+PgDn. The user's answers of
 * the same day to decisions 196 and 197 add no key. Only the Mac app has
 * the sidebar toggle, Back, and Forward, so they have no key here.
 */
export const windowsKeys: Readonly<Record<CommandId, readonly Shortcut[]>> = {
  'command-palette': ['Ctrl+K'],
  'keyboard-shortcuts': ['Alt+Shift+/'],
  'account-page': ['Ctrl+,'],
  'create-org': [],
  'toggle-sidebar': [],
  'toggle-right-column': ['Alt+Shift+B'],
  back: [],
  forward: [],
  'workspace-list': ['Ctrl+Shift+H'],
  'previous-tab': [
    'Ctrl+Shift+Tab',
    'Ctrl+Shift+[',
    'Alt+Shift+←',
    'Alt+Shift+[',
  ],
  'next-tab': ['Ctrl+Tab', 'Ctrl+Shift+]', 'Alt+Shift+→', 'Alt+Shift+]'],
  'close-tab': ['Ctrl+W', 'Alt+Shift+W'],
  'reopen-session': ['Ctrl+Shift+T', 'Alt+Shift+Z'],
  'org-1': ['Alt+1'],
  'org-2': ['Alt+2'],
  'org-3': ['Alt+3'],
  'org-4': ['Alt+4'],
  'org-5': ['Alt+5'],
  'org-6': ['Alt+6'],
  'org-7': ['Alt+7'],
  'org-8': ['Alt+8'],
  'org-9': ['Alt+9'],
  'repositories-settings': ['Alt+Shift+A'],
  'new-workspace': ['Ctrl+N', 'Alt+Shift+N'],
  'new-section': [],
  'archive-workspace': ['Ctrl+Shift+A'],
  'restore-workspace': [],
  'workspace-1': ['Ctrl+1', 'Alt+Shift+1'],
  'workspace-2': ['Ctrl+2', 'Alt+Shift+2'],
  'workspace-3': ['Ctrl+3', 'Alt+Shift+3'],
  'workspace-4': ['Ctrl+4', 'Alt+Shift+4'],
  'workspace-5': ['Ctrl+5', 'Alt+Shift+5'],
  'workspace-6': ['Ctrl+6', 'Alt+Shift+6'],
  'workspace-7': ['Ctrl+7', 'Alt+Shift+7'],
  'workspace-8': ['Ctrl+8', 'Alt+Shift+8'],
  'workspace-9': ['Ctrl+9', 'Alt+Shift+9'],
  'previous-workspace': ['Alt+Shift+↑', 'Alt+Shift+PgUp'],
  'next-workspace': ['Alt+Shift+↓', 'Alt+Shift+PgDn'],
  'next-needs-input': ['Alt+Shift+L'],
  'go-to-all-files': [],
  'go-to-changes': ['Alt+Shift+U'],
  'go-to-checks': [],
  'go-to-terminal': ['Ctrl+J'],
  'go-to-preview': [],
  'new-session': ['Ctrl+T', 'Alt+Shift+T'],
  'session-history': [],
  'focus-message': ['Ctrl+L', 'Ctrl+Shift+L'],
  'attach-files': ['Ctrl+U'],
  'model-picker': ['Alt+Shift+M'],
  'next-effort': ['Ctrl+Shift+/'],
  'stop-agent': ['Alt+Shift+S'],
}

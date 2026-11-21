import type { CommandId } from '../../../fixtures/shortcutCommands'
import {
  browserHosts,
  type ShortcutHost,
} from '../../../fixtures/shortcutHosts'

/**
 * A shortcut as its keyboard prints each of its keys, as `Shortcut`: its
 * modifiers, then its key, such as `['⇧', '⌘', 'P']`.
 */
export const shortcutSchema = {
  type: 'array',
  minItems: 1,
  items: { type: 'string', minLength: 1 },
} as const

/** The shortcuts of one command, as a list of `Shortcut`. */
const shortcutList = { type: 'array', items: shortcutSchema } as const

/**
 * The person's changes to the shortcuts as JSON, as `ShortcutChanges`: the
 * shortcuts of each command that differs from its defaults. A Mokly schema
 * lists each key of an object, so this lists every command. The check
 * after it fails the typecheck when a command is missing or unknown.
 */
export const shortcutChangesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    'command-palette': shortcutList,
    'keyboard-shortcuts': shortcutList,
    'account-page': shortcutList,
    'create-org': shortcutList,
    'send-feedback': shortcutList,
    'toggle-sidebar': shortcutList,
    'toggle-right-column': shortcutList,
    back: shortcutList,
    forward: shortcutList,
    'workspace-list': shortcutList,
    'previous-tab': shortcutList,
    'next-tab': shortcutList,
    'close-tab': shortcutList,
    'reopen-session': shortcutList,
    'org-1': shortcutList,
    'org-2': shortcutList,
    'org-3': shortcutList,
    'org-4': shortcutList,
    'org-5': shortcutList,
    'org-6': shortcutList,
    'org-7': shortcutList,
    'org-8': shortcutList,
    'org-9': shortcutList,
    'repositories-settings': shortcutList,
    'new-workspace': shortcutList,
    'new-section': shortcutList,
    'archive-workspace': shortcutList,
    'restore-workspace': shortcutList,
    'copy-link': shortcutList,
    'workspace-1': shortcutList,
    'workspace-2': shortcutList,
    'workspace-3': shortcutList,
    'workspace-4': shortcutList,
    'workspace-5': shortcutList,
    'workspace-6': shortcutList,
    'workspace-7': shortcutList,
    'workspace-8': shortcutList,
    'workspace-9': shortcutList,
    'previous-workspace': shortcutList,
    'next-workspace': shortcutList,
    'next-needs-input': shortcutList,
    'create-pull-request': shortcutList,
    'fix-checks': shortcutList,
    'resolve-conflicts': shortcutList,
    'merge-latest': shortcutList,
    'address-review': shortcutList,
    'commit-and-push': shortcutList,
    'mark-ready-for-review': shortcutList,
    'merge-pull-request': shortcutList,
    'continue-after-merge': shortcutList,
    'open-pull-request': shortcutList,
    'go-to-all-files': shortcutList,
    'go-to-changes': shortcutList,
    'go-to-checks': shortcutList,
    'go-to-terminal': shortcutList,
    'go-to-preview': shortcutList,
    'new-terminal': shortcutList,
    'new-session': shortcutList,
    'session-history': shortcutList,
    'focus-message': shortcutList,
    'attach-files': shortcutList,
    'model-picker': shortcutList,
    'next-effort': shortcutList,
    'fast-mode': shortcutList,
    'stop-agent': shortcutList,
    'copy-concise-transcript': shortcutList,
    'copy-full-transcript': shortcutList,
  },
} as const satisfies {
  type: 'object'
  additionalProperties: false
  properties: Readonly<Record<CommandId, typeof shortcutList>>
}

/** Where the app runs, as `ShortcutHost` lists them. */
export const shortcutHosts = [
  'mac-app',
  ...browserHosts,
] as const satisfies readonly ShortcutHost[]

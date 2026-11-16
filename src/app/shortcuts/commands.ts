import { agentActionLabels } from '../../../docs/mockups/src/components/workspace/barCopy'
import { transcriptItems } from '../../../docs/mockups/src/components/workspace/transcriptCopy'
import {
  shortcutDigits,
  type ShortcutCommandId,
} from '../../shared/shortcut-commands'
import {
  accountSettings,
  actionTexts,
  orgSettings,
  type CommandText,
} from '../palette/commands'

type ShortcutGroup = 'General' | 'View' | 'Navigation' | 'Workspace' | 'Chat'
type ShortcutScope =
  'every-page' | 'palette' | 'workspace' | 'org-page' | 'mac-app'

export interface ShortcutCommand extends CommandText {
  readonly id: ShortcutCommandId
  readonly group: ShortcutGroup
  readonly scope: ShortcutScope
  readonly only?: 'mac-app'
}

function command(
  id: ShortcutCommandId,
  group: ShortcutGroup,
  scope: ShortcutScope,
  label: string,
  words: readonly string[] = [],
  only?: 'mac-app',
): ShortcutCommand {
  return { id, group, scope, label, words, ...(only ? { only } : {}) }
}

function palette(
  id: keyof typeof actionTexts & ShortcutCommandId,
  group: ShortcutGroup,
): ShortcutCommand {
  const { label, words } = actionTexts[id]
  return command(id, group, 'palette', label, words)
}

/** One text per command serves the palette offers and the settings search. */
export const shortcutCommands: readonly ShortcutCommand[] = [
  command('command-palette', 'General', 'every-page', 'Command palette', [
    'search',
  ]),
  command(
    'keyboard-shortcuts',
    'General',
    'palette',
    accountSettings['keyboard-shortcuts'].label,
    accountSettings['keyboard-shortcuts'].words,
  ),
  command('account-page', 'General', 'every-page', 'Account page', [
    'settings',
    'preferences',
  ]),
  palette('create-org', 'General'),
  palette('send-feedback', 'General'),
  command(
    'toggle-sidebar',
    'View',
    'palette',
    'Hide or show the sidebar',
    actionTexts['hide-sidebar'].words,
    'mac-app',
  ),
  command(
    'toggle-right-column',
    'View',
    'workspace',
    'Hide or show the right column',
  ),
  command('back', 'Navigation', 'mac-app', 'Back', [], 'mac-app'),
  command('forward', 'Navigation', 'mac-app', 'Forward', [], 'mac-app'),
  command('workspace-list', 'Navigation', 'org-page', 'Workspace list'),
  command('previous-tab', 'Navigation', 'workspace', 'Previous tab', [
    'session',
  ]),
  command('next-tab', 'Navigation', 'workspace', 'Next tab', ['session']),
  command('close-tab', 'Navigation', 'workspace', 'Close tab', ['session']),
  command(
    'reopen-session',
    'Navigation',
    'workspace',
    'Reopen closed session',
    ['tab'],
  ),
  ...shortcutDigits.map((digit) =>
    command(
      `org-${digit}`,
      'Navigation',
      'palette',
      `${actionTexts['switch-org'].label} org ${digit}`,
      actionTexts['switch-org'].words,
    ),
  ),
  command(
    'repositories-settings',
    'Navigation',
    'palette',
    'Repositories settings',
    orgSettings.find((setting) => setting.tab === 'repositories')?.words ?? [],
  ),
  palette('new-workspace', 'Workspace'),
  palette('new-section', 'Workspace'),
  palette('archive-workspace', 'Workspace'),
  palette('restore-workspace', 'Workspace'),
  command('copy-link', 'Workspace', 'workspace', 'Copy link', [
    'url',
    'workspace',
    'clipboard',
  ]),
  ...shortcutDigits.map((digit) =>
    command(
      `workspace-${digit}`,
      'Workspace',
      'org-page',
      `Open workspace ${digit}`,
    ),
  ),
  command('previous-workspace', 'Workspace', 'org-page', 'Previous workspace'),
  command('next-workspace', 'Workspace', 'org-page', 'Next workspace'),
  command(
    'next-needs-input',
    'Workspace',
    'org-page',
    'Next workspace that needs input',
  ),
  command(
    'create-pull-request',
    'Workspace',
    'workspace',
    agentActionLabels['create-pull-request'],
    ['pull request', 'github', 'publish'],
  ),
  command(
    'fix-checks',
    'Workspace',
    'workspace',
    agentActionLabels['fix-checks'],
    ['ci', 'errors', 'pull request'],
  ),
  command(
    'resolve-conflicts',
    'Workspace',
    'workspace',
    agentActionLabels['resolve-conflicts'],
    ['merge', 'rebase', 'pull request'],
  ),
  command(
    'address-review',
    'Workspace',
    'workspace',
    agentActionLabels['address-review'],
    ['comments', 'feedback', 'pull request'],
  ),
  command(
    'commit-and-push',
    'Workspace',
    'workspace',
    agentActionLabels['commit-and-push'],
    ['git', 'save', 'publish'],
  ),
  command('merge-pull-request', 'Workspace', 'workspace', 'Merge PR', [
    'pull request',
    'github',
    'squash',
    'rebase',
  ]),
  command(
    'continue-after-merge',
    'Workspace',
    'workspace',
    'Continue after merge',
    ['new branch', 'merged', 'workspace'],
  ),
  command('open-pull-request', 'Workspace', 'workspace', 'Open PR on GitHub', [
    'pull request',
    'github',
    'browser',
  ]),
  palette('go-to-all-files', 'Workspace'),
  palette('go-to-changes', 'Workspace'),
  palette('go-to-checks', 'Workspace'),
  palette('go-to-terminal', 'Workspace'),
  palette('go-to-preview', 'Workspace'),
  palette('new-session', 'Chat'),
  palette('session-history', 'Chat'),
  command('focus-message', 'Chat', 'workspace', 'Focus the message field'),
  command('attach-files', 'Chat', 'workspace', 'Attach files', ['upload']),
  command('model-picker', 'Chat', 'workspace', 'Model picker'),
  command('next-effort', 'Chat', 'workspace', 'Next effort level'),
  command('fast-mode', 'Chat', 'workspace', 'Fast mode'),
  command('stop-agent', 'Chat', 'workspace', 'Stop the agent', ['cancel']),
  command(
    'copy-concise-transcript',
    'Chat',
    'workspace',
    transcriptItems.concise,
    ['markdown', 'clipboard', 'chat'],
  ),
  command('copy-full-transcript', 'Chat', 'workspace', transcriptItems.full, [
    'markdown',
    'clipboard',
    'chat',
    'expanded',
  ]),
]

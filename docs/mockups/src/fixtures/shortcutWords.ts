import { sendFeedbackWords } from '../../../../src/ui/components/feedback/feedbackCopy'
import { mergeLatestWords } from '../../../../src/ui/components/workspace/mergeLatestCopy'
import type { CommandId } from './shortcutCommands'

/**
 * The words that a person may search for and that the label of a command
 * lacks. A command that the palette also lists has the palette's words.
 */
export const commandWords: Partial<Record<CommandId, readonly string[]>> = {
  'command-palette': ['search'],
  'keyboard-shortcuts': ['keys', 'hotkeys', 'keybindings'],
  'account-page': ['settings', 'preferences'],
  'create-org': ['new', 'team'],
  'send-feedback': sendFeedbackWords,
  'previous-tab': ['session'],
  'next-tab': ['session'],
  'close-tab': ['session'],
  'reopen-session': ['tab'],
  'repositories-settings': ['github'],
  'new-workspace': ['create', 'task'],
  'new-section': ['group'],
  'restore-workspace': ['unarchive'],
  'copy-link': ['url', 'workspace', 'clipboard'],
  'create-pull-request': ['pull request', 'github', 'publish'],
  'fix-checks': ['ci', 'errors', 'pull request'],
  'resolve-conflicts': ['merge', 'rebase', 'pull request'],
  'merge-latest': mergeLatestWords,
  'address-review': ['comments', 'feedback', 'pull request'],
  'commit-and-push': ['git', 'save', 'publish'],
  'mark-ready-for-review': ['draft', 'pull request', 'github'],
  'merge-pull-request': ['pull request', 'github', 'squash', 'rebase'],
  'continue-after-merge': ['new branch', 'merged', 'workspace'],
  'open-pull-request': ['pull request', 'github', 'browser'],
  'go-to-checks': ['ci'],
  'go-to-preview': ['port'],
  'new-terminal': ['shell', 'tab'],
  'new-session': ['tab', 'agent', 'chat'],
  'session-history': ['closed', 'reopen'],
  'attach-files': ['upload'],
  'stop-agent': ['cancel'],
  'copy-concise-transcript': ['markdown', 'clipboard', 'chat'],
  'copy-full-transcript': ['markdown', 'clipboard', 'chat', 'expanded'],
}

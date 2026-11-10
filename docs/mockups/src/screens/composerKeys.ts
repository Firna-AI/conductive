/**
 * The keys of the composer states of the workspace screen. The `composer`
 * property of `workspaceStateSchema` says what each one draws.
 */
export const composerKeys = [
  'empty',
  'draft',
  'attachments',
  'uploading',
  'upload-failed',
  'too-large',
  'picker',
  'no-agent',
  'no-starter-login',
  'not-shared',
  'workspace-link',
  'mention-query',
  'mention-start',
  'mention-none',
  'mention-loading',
  'mention-unavailable',
  'file-chips',
  'file-chip-pointer',
  'workspace-link-pointer',
  'attachment-pointer',
] as const

/**
 * The keys of the sandbox states of the workspace screen. The `sandbox`
 * property of `workspaceStateSchema` says what each one draws.
 */
export const sandboxKeys = [
  'ready',
  'starting',
  'stopped',
  'error',
  'refused',
  'archived',
  'inactive',
  'archived-inactive',
] as const

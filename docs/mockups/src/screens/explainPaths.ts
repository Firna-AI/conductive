/**
 * The catalogue paths of Explain, under `app/chat/explain`. They stay
 * beside the paths of the catalogue in `paths.ts`.
 */
export const explainPaths = {
  answered: 'app/chat/explain',
  select: 'app/chat/explain/select',
  working: 'app/chat/explain/popover',
  answering: 'app/chat/explain/popover/run',
  starting: 'app/chat/explain/popover/run/starting',
  followUp: 'app/chat/explain/popover/run/follow-up',
  waiting: 'app/chat/explain/popover/run/waiting',
  failed: 'app/chat/explain/popover/failed',
  stopped: 'app/chat/explain/popover/failed/stopped',
  computerStopped: 'app/chat/explain/popover/failed/computer-stopped',
  long: 'app/chat/explain/popover/long',
  longFull: 'app/chat/explain/popover/long/full',
  marks: 'app/chat/explain/marks',
  running: 'app/chat/explain/marks/running',
  menu: 'app/chat/explain/marks/menu',
  closed: 'app/chat/explain/closed',
  tab: 'app/chat/explain/tab',
  readOnly: 'app/chat/explain/read-only',
  readOnlyPopover: 'app/chat/explain/read-only/popover',
} as const

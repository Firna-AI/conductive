/** The folder of the terminal bridge in the active release. */
const BRIDGE_ROOT = '/opt/conductive/current/system/terminal-bridge'

/** The program that ttyd runs for each connection. */
export const BRIDGE_MAIN = `${BRIDGE_ROOT}/worker/terminal/bridge/main.ts`

/** Repository paths preserved by the system release packager. */
export const BRIDGE_PATHS = [
  'src/shared/terminal-bridge.ts',
  'worker/terminal/bridge/bridge.ts',
  'worker/terminal/bridge/commands.ts',
  'worker/terminal/bridge/control.ts',
  'worker/terminal/bridge/flow.ts',
  'worker/terminal/bridge/folder.ts',
  'worker/terminal/bridge/input.ts',
  'worker/terminal/bridge/links.ts',
  'worker/terminal/bridge/main.ts',
  'worker/terminal/bridge/queue.ts',
  'worker/terminal/bridge/screen.ts',
  'worker/terminal/bridge/size.ts',
  'worker/terminal/bridge/style.ts',
  'worker/terminal/bridge/sync.ts',
] as const

import sharedMessages from '../../src/shared/terminal-bridge.ts?raw'
import bridge from './bridge/bridge.ts?raw'
import commands from './bridge/commands.ts?raw'
import control from './bridge/control.ts?raw'
import flow from './bridge/flow.ts?raw'
import input from './bridge/input.ts?raw'
import links from './bridge/links.ts?raw'
import main from './bridge/main.ts?raw'
import queue from './bridge/queue.ts?raw'
import screen from './bridge/screen.ts?raw'
import size from './bridge/size.ts?raw'
import style from './bridge/style.ts?raw'
import sync from './bridge/sync.ts?raw'

/** The folder of the terminal bridge in the image. */
export const BRIDGE_ROOT = '/usr/local/lib/conductive/terminal-bridge'

/** The program that ttyd runs for each connection. */
export const BRIDGE_MAIN = `${BRIDGE_ROOT}/worker/terminal/bridge/main.ts`

/**
 * The files of the bridge, by their path in this repository. The image keeps
 * the same paths under `BRIDGE_ROOT`, so their relative imports work there.
 * The private Node runs them with its type stripping. `package.json` makes
 * Node read them as ES modules.
 */
export const BRIDGE_FILES: Readonly<Record<string, string>> = {
  'package.json': '{ "type": "module" }\n',
  'src/shared/terminal-bridge.ts': sharedMessages,
  'worker/terminal/bridge/bridge.ts': bridge,
  'worker/terminal/bridge/commands.ts': commands,
  'worker/terminal/bridge/control.ts': control,
  'worker/terminal/bridge/flow.ts': flow,
  'worker/terminal/bridge/input.ts': input,
  'worker/terminal/bridge/links.ts': links,
  'worker/terminal/bridge/main.ts': main,
  'worker/terminal/bridge/queue.ts': queue,
  'worker/terminal/bridge/screen.ts': screen,
  'worker/terminal/bridge/size.ts': size,
  'worker/terminal/bridge/style.ts': style,
  'worker/terminal/bridge/sync.ts': sync,
}

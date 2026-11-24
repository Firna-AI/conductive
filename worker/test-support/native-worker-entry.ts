import { COMPUTER_PATH } from '../../src/shared/computer'
import { HOST_PATH } from '../../src/shared/host'
import { createApp } from '../application'
import type { AppEnv } from '../env'
import { nativeEntryFetch } from './native-entry-router'
import { NATIVE_TEST_TIME } from './native-workspace-api'
import type { NativeWorkspace } from './native-workspace-entry'

export { Machine } from '../machines/machine'
export { OwnComputer } from '../own-computers/own-computer'
export { NativeWorkspace } from './native-workspace-entry'

interface NativeEnvironment extends AppEnv {
  WORKSPACES: DurableObjectNamespace<NativeWorkspace>
}

const app = createApp({ now: () => NATIVE_TEST_TIME })

export default {
  fetch(request: Request, env: NativeEnvironment, execution: ExecutionContext) {
    const { pathname } = new URL(request.url)
    if (pathname === COMPUTER_PATH || pathname === HOST_PATH)
      return app.fetch(request, env, execution)
    return nativeEntryFetch(request, env)
  },
}

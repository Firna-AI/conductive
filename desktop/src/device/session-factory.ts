import type {
  DeviceCommandRecord,
  DevicePairing,
  DeviceToWorker,
} from '../../../src/shared/device.ts'
import type { DeviceClock } from './clock.js'
import type { DeviceFiles } from './files.js'
import { createPermissionStore } from './permissions.js'
import type { PermissionStore } from './permissions.js'
import type { LaunchCommand } from './process.js'
import { runCommand } from './runner.js'
import { createDeviceSession } from './session.js'
import { createImportController } from '../import/controller.ts'
import type { ImportControllerDependencies } from '../import/controller.ts'
import type { ImportFrameSend } from '../import/types.ts'

interface SessionFactoryDependencies {
  files: DeviceFiles
  deviceName: string
  clock: DeviceClock
  launch: LaunchCommand
  notify(request: DeviceCommandRecord): () => void
  warn(): void
  imports?: Pick<ImportControllerDependencies, 'preferences' | 'jobs' | 'put'>
}

/** The application owns account permissions across all device connections. */
export function createDeviceSessionFactory(
  dependencies: SessionFactoryDependencies,
) {
  const stores = new Map<string, PermissionStore>()
  return {
    session(
      userId: string,
      pairing: DevicePairing,
      send: (message: DeviceToWorker) => boolean,
      invalid: () => void,
      sendImport?: ImportFrameSend,
    ) {
      let permissions = stores.get(userId)
      if (permissions) permissions.retryRead()
      else {
        permissions = createPermissionStore({ ...dependencies, userId })
        stores.set(userId, permissions)
      }
      return createDeviceSession({
        ...dependencies,
        userId,
        pairing,
        send,
        invalid,
        permissions,
        run: (request) => runCommand(request, dependencies),
        importer: dependencies.imports
          ? createImportController({
              ...dependencies.imports,
              userId,
              send,
              sendImport,
              warn: dependencies.warn,
            })
          : undefined,
      })
    },
    dispose(): void {
      stores.forEach((store) => store.dispose())
      stores.clear()
    },
  }
}

import { resolve } from 'node:path'
import type { ElectronApplication } from '@playwright/test'
import type { ImportLocationsInput } from '../src/import/types.ts'

export async function importThroughMain(
  electron: ElectronApplication,
  locations: ImportLocationsInput,
) {
  return electron.evaluate(
    async ({ app }, input) => {
      const { createRequire } = process.getBuiltinModule('node:module')
      const { resolve } = process.getBuiltinModule('node:path')
      const load = createRequire(resolve(app.getAppPath(), 'package.json'))
      const { runImportMainFixture }: typeof import('./import-runtime.ts') =
        load(input.module)
      return runImportMainFixture(app.getAppPath(), input.locations)
    },
    { module: resolve(import.meta.dirname, 'import-runtime.ts'), locations },
  )
}

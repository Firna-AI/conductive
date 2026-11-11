import { join } from 'node:path'

import { pendingImport } from './import-receiver'
import { ImportStorage, readImportJson, saveImportJson } from './import-storage'

export const RUNNER_IMPORT_SERVICE_HOME = '/home/user'

/** Only imported computers keep transport state here. Agent homes keep their configuration. */
export async function importRuntimeState(
  serviceHome: string,
  workspaceId: string,
  nativeStatePath: string,
): Promise<string> {
  const pending = await pendingImport(serviceHome)
  const identityPath = join(serviceHome, '.conductive', 'import-runtime')
  const saved = await readImportJson(identityPath)
  const previous =
    typeof saved === 'object' &&
    saved !== null &&
    'workspaceId' in saved &&
    saved.workspaceId === workspaceId &&
    'activationId' in saved &&
    typeof saved.activationId === 'string'
      ? saved.activationId
      : null
  const activationId = pending ?? previous
  if (!activationId) return nativeStatePath
  const storage = new ImportStorage(serviceHome, activationId)
  await storage.prepare()
  if (pending) await saveImportJson(identityPath, { workspaceId, activationId })
  return storage.path('runner-state', workspaceId)
}

import {
  runnerImportWire,
  type RunnerImportCommand,
} from '../../src/shared/runner-import'
import type { ActiveRunner } from './types'
import type { RunnerFileCommand } from '../../src/shared/runner-files'

export async function sendRunnerImport(
  active: ActiveRunner | null,
  connectionId: string | null,
  workspaceId: string,
  command: Omit<RunnerImportCommand, 'connectionId'>,
): Promise<string | null> {
  if (
    !active?.ready ||
    !connectionId ||
    active.workspace.id !== workspaceId ||
    !(await active.peer.authorize())
  )
    return null
  const frame = { ...command, connectionId }
  runnerImportWire(frame)
  await active.peer.send(frame)
  return connectionId
}

export async function sendRunnerFile(
  active: ActiveRunner | null,
  workspaceId: string,
  command: RunnerFileCommand,
  close: () => void,
): Promise<boolean> {
  if (!active?.ready || active.workspace.id !== workspaceId) return false
  try {
    await active.peer.send(command)
    return true
  } catch {
    close()
    return false
  }
}

import { isRecord } from '../http'

export const WORKSPACE_READ_VERSION = 1

export type WorkspaceReadMark = { version: typeof WORKSPACE_READ_VERSION } & (
  { state: 'complete' } | { state: 'recovering'; cutoff: number }
)

export function readWorkspaceReadMark(
  value: unknown,
): WorkspaceReadMark | undefined {
  if (!isRecord(value) || value.version !== WORKSPACE_READ_VERSION) return
  const version = WORKSPACE_READ_VERSION
  if (value.state === 'complete') return { version, state: 'complete' }
  const { cutoff } = value
  if (
    value.state === 'recovering' &&
    typeof cutoff === 'number' &&
    Number.isSafeInteger(cutoff) &&
    cutoff >= 0
  )
    return { version, state: 'recovering', cutoff }
}

import {
  importPage,
  importEncodedBytes,
} from '../../src/shared/conductor-import-pages'
import {
  runnerImportWire,
  RUNNER_IMPORT_BYTES,
  type RunnerImportAction,
} from '../../src/shared/runner-import'
import {
  readPublishedManifestPage,
  readPublishedPartRange,
} from '../conductor-import/activation-data'
import type { AppEnv } from '../env'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { ImportPendingAction } from './import-activation-types'

type ActivationJob = Extract<WorkspaceStartJob, { kind: 'activate' }>

async function manifestHash(entries: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(entries))
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function envelope(job: ActivationJob, action: unknown) {
  return {
    type: 'import.command',
    activationId: job.attempt,
    epoch: job.activation.epoch,
    commandId: `${job.attempt}:${job.activation.sequence}`,
    connectionId: 'x'.repeat(256),
    action,
  }
}

async function rangeBytes(
  env: AppEnv,
  job: ActivationJob,
  action: Extract<ImportPendingAction, { kind: 'chunk' }>,
) {
  const bytes = await readPublishedPartRange(
    env,
    job.orgId,
    job.workspaceId,
    action.part.id,
    { offset: action.offset, length: action.length },
  )
  const digest = [
    ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  ]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return { bytes, digest }
}

export async function importPhaseAction(
  env: AppEnv,
  job: ActivationJob,
): Promise<ImportPendingAction | null> {
  const progress = job.activation
  if (job.phase === 'import-open')
    return {
      kind: 'open',
      workspaceId: job.workspaceId,
      snapshot: progress.snapshot,
      defaultBranch: job.defaultBranch,
      deadlineAt: job.deadlineAt ?? 0,
    }
  if (job.phase === 'import-preflight') return { kind: 'preflight' }
  if (job.phase === 'import-restore') return { kind: 'restore' }
  if (job.phase === 'import-finish') return { kind: 'finish' }
  const page = await readPublishedManifestPage(
    env,
    job.orgId,
    job.workspaceId,
    progress.cursor,
  )
  if (job.phase === 'import-manifest') {
    if (!page.entries.length) return null
    const entries = importPage(
      page.entries,
      (entries) =>
        envelope(job, { kind: 'manifest', offset: progress.cursor, entries }),
      RUNNER_IMPORT_BYTES,
    )
    return {
      kind: 'manifest',
      offset: progress.cursor,
      count: entries.length,
      sha256: await manifestHash(entries),
    }
  }
  if (job.phase === 'import-sessions') {
    const index = page.entries.findIndex((entry) => entry.kind === 'session')
    if (index < 0) return null
    job.activation.cursor += index
    const session = page.entries[index]
    return session.kind === 'session'
      ? { kind: 'session', documentId: session.id }
      : null
  }
  if (job.phase === 'import-parts') {
    const index = page.entries.findIndex((entry) => entry.kind === 'part')
    if (index < 0) return null
    job.activation.cursor += index
    const entry = page.entries[index]
    if (entry.kind !== 'part') return null
    const action = {
      kind: 'chunk' as const,
      part: entry.part,
      offset: progress.partOffset,
      length: 0,
      sha256: '0'.repeat(64),
    }
    const available =
      RUNNER_IMPORT_BYTES -
      1 -
      importEncodedBytes(
        envelope(job, { ...action, length: entry.part.sizeBytes, base64: '' }),
      )
    action.length = Math.min(
      524_288,
      entry.part.sizeBytes - progress.partOffset,
      Math.floor(available / 4) * 3,
    )
    if (
      action.length < 0 ||
      (action.length === 0 && entry.part.sizeBytes !== 0)
    )
      throw new Error('The import range cannot fit its envelope.')
    action.sha256 = (await rangeBytes(env, job, action)).digest
    return action
  }
  throw new Error('Invalid import delivery phase.')
}

/** Sending returns before the ACK. The receiver's queue remains free to store it. */
export async function deliverImportAction(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  job: ActivationJob,
) {
  const pending = job.activation.pending
  if (!pending) throw new Error('Missing import delivery intent.')
  let action: RunnerImportAction
  if (pending.action.kind === 'chunk') {
    const { bytes, digest } = await rangeBytes(env, job, pending.action)
    if (digest !== pending.action.sha256)
      throw new Error('The sealed import range changed.')
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 8192)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
    action = { ...pending.action, base64: btoa(binary) }
  } else if (pending.action.kind === 'manifest') {
    const page = await readPublishedManifestPage(
      env,
      job.orgId,
      job.workspaceId,
      pending.action.offset,
    )
    const entries = page.entries.slice(0, pending.action.count)
    if (
      entries.length !== pending.action.count ||
      (await manifestHash(entries)) !== pending.action.sha256
    )
      throw new Error('The immutable import manifest changed.')
    action = { kind: 'manifest', offset: pending.action.offset, entries }
  } else action = pending.action
  const command = {
    type: 'import.command' as const,
    activationId: job.attempt,
    epoch: job.activation.epoch,
    commandId: pending.commandId,
    action,
  }
  // Leave room for the actual connection identity before touching the socket.
  runnerImportWire({ ...command, connectionId: 'x'.repeat(256) })
  const connectionId = await endpoint.sendImportCommand(
    job.workspaceId,
    command,
  )
  if (connectionId)
    await storage.update({
      ...job,
      activation: { ...job.activation, pending: { ...pending, connectionId } },
    })
}

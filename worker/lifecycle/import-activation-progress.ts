import { importSessionId } from '../../src/shared/runner-import'
import { configuredModels } from '../app-api/models'
import { readPublishedManifestPage } from '../conductor-import/activation-data'
import { readUser } from '../data/users'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { SandboxProvider } from '../sandbox/provider'
import {
  deliverImportAction,
  importPhaseAction,
} from './import-activation-delivery'
import {
  advanceStartCommand,
  nextStartCommand,
} from './start-command-execution'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

type Job = Extract<WorkspaceStartJob, { kind: 'activate' }>
const restoreLabel = 'Restoring your work'

async function seedContinuation(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  job: Job,
  preparation: 'prepared' | 'fallback',
) {
  const page = await readPublishedManifestPage(
    env,
    job.orgId,
    job.workspaceId,
    job.activation.cursor,
  )
  const recipe = page.entries[0]
  if (recipe?.kind !== 'session')
    throw new Error('Missing imported session recipe.')
  const importer = await readUser(env.DB, job.activation.importerUserId)
  if (!importer) throw new Error('Missing imported session starter.')
  const models = configuredModels(env)
  const model =
    models.find(
      (model) => model.agent === recipe.agent && model.model === recipe.model,
    ) ?? models.find((model) => model.agent === recipe.agent)
  if (!model) throw new Error('The imported agent model is unavailable.')
  await endpoint.seedImportSession(job.workspaceId, {
    id: importSessionId(recipe.id),
    starter: importer,
    choice: {
      agent: recipe.agent,
      model: model.model,
      effort: model.efforts[0],
    },
    title: recipe.title,
    createdAt: recipe.occurredAt ?? 0,
    conductorImport: { documentId: recipe.id, preparation },
  })
}

export async function advanceImportActivation(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  provider: SandboxProvider,
  row: WorkspaceRow,
  job: WorkspaceStartJob,
): Promise<boolean> {
  if (job.kind !== 'activate' || !job.phase.startsWith('import-')) return false
  if (job.phase === 'import-software' || job.phase === 'import-launch') {
    const label = 'Preparing the cloud computer'
    if (
      !(await advanceStartCommand(
        env,
        endpoint,
        storage,
        provider,
        row,
        job,
        label,
      ))
    )
      return true
    await endpoint.lifecycleStep(job.phase, label, 'completed')
    const next =
      job.phase === 'import-software'
        ? 'import-launch'
        : (job.activation.resumePhase ?? 'import-open')
    if (job.phase === 'import-launch') job.activation.resumePhase = undefined
    await nextStartCommand(storage, job, next)
    return true
  }
  if (job.phase === 'import-publish') {
    await nextStartCommand(storage, job, 'runner')
    return true
  }
  if (!(await endpoint.readLifecycle())?.runnerConnected) return true
  const progress = job.activation
  const pending = progress.pending
  if (pending?.result) {
    const result = pending.result
    if (!result.ok)
      throw Object.assign(
        new HttpError(502, result.error.code, result.error.message),
        {
          requiredBytes: result.error.requiredBytes,
          availableBytes: result.error.availableBytes,
        },
      )
    const action = pending.action
    progress.pending = undefined
    progress.sequence++
    if (action.kind === 'open') job.phase = 'import-manifest'
    if (action.kind === 'manifest') progress.cursor += action.count
    if (action.kind === 'preflight') {
      await endpoint.lifecycleStep(
        'import-preflight',
        'Checking space for your work',
        'completed',
      )
      job.phase = 'import-parts'
      progress.cursor = 0
    }
    if (action.kind === 'chunk') {
      progress.partOffset += action.length
      if (progress.partOffset === action.part.sizeBytes) {
        progress.cursor++
        progress.partOffset = 0
      }
    }
    if (action.kind === 'restore') {
      job.phase = 'import-sessions'
      progress.cursor = 0
    }
    if (action.kind === 'session') {
      if (!result.preparation)
        throw new Error('Missing native preparation result.')
      await seedContinuation(env, endpoint, job, result.preparation)
      progress.cursor++
    }
    if (action.kind === 'finish') {
      progress.finished = true
      job.phase = 'import-publish'
    }
    await storage.update(job)
    return true
  }
  if (!pending) {
    if (job.phase === 'import-preflight')
      await endpoint.lifecycleStep(
        'import-preflight',
        'Checking space for your work',
        'running',
      )
    if (job.phase === 'import-parts')
      await endpoint.lifecycleStep('import-restore', restoreLabel, 'running')
    const action = await importPhaseAction(env, job)
    if (!action) {
      const page = await readPublishedManifestPage(
        env,
        job.orgId,
        job.workspaceId,
        progress.cursor,
      )
      if (page.nextCursor !== null || page.entries.length)
        progress.cursor += page.entries.length
      else if (job.phase === 'import-manifest') {
        job.phase = 'import-preflight'
        progress.cursor = 0
      } else if (job.phase === 'import-parts') {
        job.phase = 'import-restore'
        progress.cursor = 0
      } else if (job.phase === 'import-sessions') {
        await endpoint.lifecycleStep(
          'import-restore',
          restoreLabel,
          'completed',
        )
        job.phase = 'startup'
        progress.cursor = 0
      }
      await storage.update(job)
      return true
    }
    progress.pending = {
      commandId: `${job.attempt}:${progress.sequence}`,
      action,
    }
    await storage.update(job)
  }
  await deliverImportAction(env, endpoint, storage, job)
  return true
}

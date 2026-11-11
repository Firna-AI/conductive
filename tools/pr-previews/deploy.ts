import { join, resolve } from 'node:path'
import { applyMigrations } from './apply-migrations.ts'
import { cleanupDatabaseResources } from './cleanup.ts'
import { shortCommit } from './commits.ts'
import { writePreviewConfig } from './config.ts'
import { createDatabase, deleteDatabase, findDatabase } from './database.ts'
import { DeploymentFailure } from './deployment-output.ts'
import { waitForHealth } from './health.ts'
import {
  migrationDrift,
  migrationFiles,
  recordedMigrations,
} from './migration-history.ts'
import { previewNames } from './names.ts'
import type { OperationContext } from './operations.ts'
import { PreviewRegistry } from './registry.ts'
import { publishRunner, type RunnerArchive } from './runner-archive.ts'
import { runWrangler } from './runtime.ts'
import { writeSecretsFile } from './secrets.ts'

export interface DeployInputs {
  number: number
  buildFolder: string
  sha: string
  runner: RunnerArchive
}

export async function deployPreview(
  ctx: OperationContext,
  inputs: DeployInputs,
) {
  const tag = shortCommit(inputs.sha)
  ctx = { ...ctx, cwd: resolve(inputs.buildFolder) }
  const names = previewNames(inputs.number, ctx.settings.zone)
  let dataReset = false
  try {
    let database = await findDatabase(ctx, names.databaseName)
    const created = database === null
    database ??= await createDatabase(ctx, names.databaseName)
    const migrations = await migrationFiles(join(ctx.cwd, 'migrations'))
    if (
      !created &&
      migrationDrift(await recordedMigrations(ctx, database.name), migrations)
    ) {
      await cleanupDatabaseResources(ctx, database.name)
      await deleteDatabase(ctx, database.name)
      dataReset = true
      database = await createDatabase(ctx, database.name)
    }
    const config = await writePreviewConfig(
      join(ctx.cwd, 'dist/conductive/wrangler.json'),
      {
        number: inputs.number,
        databaseId: database.id,
        runnerArchiveUrl: inputs.runner.url,
        runnerArchiveSha256: inputs.runner.sha256,
        settings: ctx.settings,
      },
    )
    await applyMigrations(ctx, database.name, config, migrations)
    await publishRunner(ctx, inputs.runner)
    const secrets = await writeSecretsFile(
      ctx.settings.secrets,
      ctx.environment,
    )
    try {
      await runWrangler(ctx, [
        'deploy',
        '--config',
        config,
        '--secrets-file',
        secrets.path,
        '--tag',
        tag,
        '--message',
        `PR ${inputs.number} at ${inputs.sha}`,
      ])
    } finally {
      await secrets.cleanup()
    }
    await waitForHealth(ctx, names.appOrigin)
    const registryRegistered = await new PreviewRegistry(ctx).add(names)
    return {
      marketingUrl: names.marketingOrigin,
      appUrl: names.appOrigin,
      dataReset,
      registryRegistered,
    }
  } catch (error) {
    throw new DeploymentFailure(error, {
      marketingUrl: names.marketingOrigin,
      appUrl: names.appOrigin,
      dataReset,
    })
  }
}

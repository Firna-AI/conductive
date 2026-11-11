import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  numberOption,
  operationOptions,
  requiredOption,
  stateOption,
  type OperationCommand,
} from './command-options.ts'
import { commentPreview, type CommentInputs } from './comment.ts'
import { deletePreview } from './delete.ts'
import { deployPreview, type DeployInputs } from './deploy.ts'
import {
  DeploymentFailure,
  deploymentLines,
  writeDeploymentOutput,
} from './deployment-output.ts'
import type { ExternalIO, OperationContext } from './operations.ts'
import { checkSettings } from './settings.ts'
import { sweepPreviews } from './sweep.ts'

export type OperationResult =
  { kind: 'complete'; lines: string[] } | { kind: 'skip'; warning: string }

async function withWorkingFolder(
  base: Omit<OperationContext, 'cwd'>,
  action: (ctx: OperationContext) => Promise<OperationResult>,
): Promise<OperationResult> {
  const cwd = await mkdtemp(
    join(
      base.environment.RUNNER_TEMP || tmpdir(),
      'conductive-preview-command-',
    ),
  )
  try {
    return await action({ ...base, cwd })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
}

export async function runOperationCommand(
  command: OperationCommand,
  args: string[],
  environment: Readonly<Record<string, string | undefined>>,
  io: ExternalIO,
): Promise<OperationResult> {
  if (command === 'comment') {
    const zone = environment.PREVIEW_ZONE
    if (!zone?.trim())
      return {
        kind: 'skip',
        warning: 'PREVIEW_ZONE is absent. Skipping preview comment.',
      }
    const values = operationOptions(command, args)
    const number = numberOption(values.pr, zone)
    const input: CommentInputs = {
      number,
      sha: requiredOption(values.sha, 'sha'),
      state: stateOption(values.state),
      dataReset: values['data-reset'] === true,
    }
    const result = await commentPreview(input, environment, io)
    return {
      kind: 'complete',
      lines: [
        `${result === 'updated' ? 'Updated' : 'Created'} preview comment for PR ${number}.`,
      ],
    }
  }
  const setup = checkSettings(environment)
  if (setup.kind === 'skip') return setup
  if (setup.kind === 'error') throw new Error(setup.message)
  const values = operationOptions(command, args)
  const wrangler = resolve(requiredOption(values.wrangler, 'wrangler'))
  const base = { settings: setup.settings, environment, io, wrangler }
  if (command === 'deploy') {
    const number = numberOption(values.pr, setup.settings.zone)
    const buildFolder = resolve(
      requiredOption(values['build-folder'], 'build-folder'),
    )
    const archive = values['runner-archive']
    const input: DeployInputs = {
      number,
      buildFolder,
      sha: requiredOption(values.sha, 'sha'),
      runner: {
        url: requiredOption(values['runner-url'], 'runner-url'),
        sha256: requiredOption(values['runner-sha256'], 'runner-sha256'),
        ...(archive === undefined ? {} : { path: resolve(archive) }),
      },
    }
    try {
      const result = await deployPreview({ ...base, cwd: buildFolder }, input)
      await writeDeploymentOutput(result, environment)
      return { kind: 'complete', lines: deploymentLines(result) }
    } catch (error) {
      if (error instanceof DeploymentFailure)
        await writeDeploymentOutput(error.output, environment)
      throw error
    }
  }
  if (command === 'delete') {
    const number = numberOption(values.pr, setup.settings.zone)
    return withWorkingFolder(base, async (ctx) => {
      await deletePreview(ctx, number)
      return { kind: 'complete', lines: [`Deleted preview ${number}.`] }
    })
  }
  return withWorkingFolder(base, async (ctx) => {
    const result = await sweepPreviews(ctx)
    return {
      kind: 'complete',
      lines: [
        `Deleted previews: ${result.deleted.join(', ') || 'none'}.`,
        `Removed orphan registry entries: ${result.removedRegistry.join(', ') || 'none'}.`,
      ],
    }
  })
}

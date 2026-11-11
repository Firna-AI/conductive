import { resolve } from 'node:path'
import {
  deploymentInputs,
  numberOption,
  requiredOption,
  type operationOptions,
} from './command-options.ts'
import { withWorkingFolder, type OperationResult } from './commands.ts'
import { commentPreview, type PreviewState } from './comment.ts'
import { deletePreview } from './delete.ts'
import { deployPreview } from './deploy.ts'
import {
  DeploymentFailure,
  deploymentLines,
  writeDeploymentOutput,
} from './deployment-output.ts'
import type { ExternalIO } from './operations.ts'
import type { PreviewSettings } from './settings.ts'

export async function eventWork(
  action: 'deploy' | 'delete',
  values: ReturnType<typeof operationOptions>,
  settings: PreviewSettings,
  environment: Readonly<Record<string, string | undefined>>,
  io: ExternalIO,
): Promise<OperationResult> {
  const number = numberOption(values.pr, settings.zone)
  const sha = requiredOption(values.sha, 'sha')
  let dataReset = false
  const comment = (state: PreviewState) =>
    commentPreview({ number, sha, state, dataReset }, environment, io)
  let result: OperationResult
  try {
    if (values.failed)
      throw new Error('Preview prerequisites failed. See the workflow run.')
    const wrangler = resolve(requiredOption(values.wrangler, 'wrangler'))
    const base = { settings, environment, io, wrangler }
    if (action === 'deploy') {
      const input = deploymentInputs(values, settings.zone)
      await comment('deploying')
      const output = await deployPreview(
        { ...base, cwd: input.buildFolder },
        input,
      )
      dataReset = output.dataReset
      await writeDeploymentOutput(output, environment)
      result = { kind: 'complete', lines: deploymentLines(output) }
    } else {
      result = await withWorkingFolder(base, async (ctx) => {
        await deletePreview(ctx, number)
        return { kind: 'complete', lines: [`Deleted preview ${number}.`] }
      })
    }
  } catch (error) {
    if (error instanceof DeploymentFailure) {
      dataReset = error.output.dataReset
      await writeDeploymentOutput(error.output, environment)
    }
    await comment('failed')
    throw error
  }
  await comment(action === 'deploy' ? 'live' : 'deleted')
  return result
}

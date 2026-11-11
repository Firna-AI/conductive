import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import type { PreviewState } from './comment.ts'
import type { DeployInputs } from './deploy.ts'
import { previewNames } from './names.ts'

export type OperationCommand =
  'deploy' | 'delete' | 'sweep' | 'comment' | 'relay'

export function operationOptions(
  command: OperationCommand | 'event',
  args: string[],
) {
  try {
    const values = parseArgs({
      args,
      strict: true,
      allowPositionals: false,
      options: {
        pr: { type: 'string' },
        zone: { type: 'string' },
        wrangler: { type: 'string' },
        'build-folder': { type: 'string' },
        'runner-url': { type: 'string' },
        'runner-sha256': { type: 'string' },
        'runner-archive': { type: 'string' },
        sha: { type: 'string' },
        state: { type: 'string' },
        'data-reset': { type: 'boolean' },
        action: { type: 'string' },
        check: { type: 'boolean' },
        failed: { type: 'boolean' },
      },
    }).values
    const deployment = [
      'pr',
      'wrangler',
      'build-folder',
      'runner-url',
      'runner-sha256',
      'runner-archive',
      'sha',
    ]
    const allowed: Record<OperationCommand | 'event', readonly string[]> = {
      deploy: deployment,
      delete: ['pr', 'wrangler'],
      sweep: ['wrangler'],
      comment: ['pr', 'sha', 'state', 'data-reset'],
      relay: ['zone', 'wrangler'],
      event: [...deployment, 'action', 'check', 'failed'],
    }
    if (Object.keys(values).some((key) => !allowed[command].includes(key)))
      throw new Error('Unsupported option.')
    return values
  } catch {
    throw new Error('Invalid command arguments. Use --help for usage.')
  }
}

export function requiredOption(
  value: string | undefined,
  name: string,
): string {
  if (!value?.trim()) throw new Error(`This command requires --${name}.`)
  return value
}

export function numberOption(value: string | undefined, zone?: string): number {
  const raw = requiredOption(value, 'pr')
  const number = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(number) || number < 1)
    throw new Error('Pull request number must be a positive safe integer.')
  return zone === undefined ? number : previewNames(number, zone).number
}

export function deploymentInputs(
  values: ReturnType<typeof operationOptions>,
  zone: string,
): DeployInputs {
  const archive = values['runner-archive']
  return {
    number: numberOption(values.pr, zone),
    buildFolder: resolve(
      requiredOption(values['build-folder'], 'build-folder'),
    ),
    sha: requiredOption(values.sha, 'sha'),
    runner: {
      url: requiredOption(values['runner-url'], 'runner-url'),
      sha256: requiredOption(values['runner-sha256'], 'runner-sha256'),
      ...(archive === undefined ? {} : { path: resolve(archive) }),
    },
  }
}

export function stateOption(value: string | undefined): PreviewState {
  if (
    value === 'deploying' ||
    value === 'live' ||
    value === 'failed' ||
    value === 'deleted'
  )
    return value
  throw new Error('--state must be deploying, live, failed, or deleted.')
}

import { parseArgs } from 'node:util'
import type { PreviewState } from './comment.ts'
import { previewNames } from './names.ts'

export type OperationCommand =
  'deploy' | 'delete' | 'sweep' | 'comment' | 'relay'

export function operationOptions(command: OperationCommand, args: string[]) {
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
      },
    }).values
    const allowed: Record<OperationCommand, readonly string[]> = {
      deploy: [
        'pr',
        'wrangler',
        'build-folder',
        'runner-url',
        'runner-sha256',
        'runner-archive',
        'sha',
      ],
      delete: ['pr', 'wrangler'],
      sweep: ['wrangler'],
      comment: ['pr', 'sha', 'state', 'data-reset'],
      relay: ['zone', 'wrangler'],
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

export function numberOption(value: string | undefined, zone: string): number {
  const raw = requiredOption(value, 'pr')
  if (!/^\d+$/.test(raw))
    throw new Error('Pull request number must be a positive safe integer.')
  return previewNames(Number(raw), zone).number
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

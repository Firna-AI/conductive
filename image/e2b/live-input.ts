import { randomUUID } from 'node:crypto'
import { resolve, sep } from 'node:path'

import { readImageSoftware } from '../../worker/lifecycle/image-software'
import { CheckError } from '../live-input'

type LiveEnvironment = Readonly<Record<string, string | undefined>>

export const e2bRequiredInputs = [
  'LIVE_E2B_KEY',
  'LIVE_E2B_DOMAIN',
  'LIVE_E2B_TEMPLATE_ID',
  'LIVE_E2B_STATE_KEY',
  'LIVE_RUNNER_ARCHIVE_URL',
  'LIVE_RUNNER_ARCHIVE_SHA256',
] as const

function required(environment: LiveEnvironment, key: string): string {
  const value = environment[key]
  if (!value) throw new CheckError(`Set ${key}.`)
  return value
}

function contextPath(root: string, value: string): string {
  const path = resolve(root, value)
  if (!path.startsWith(`${resolve(root, '.context')}${sep}`))
    throw new CheckError(
      'Save E2B live-check state and output under .context/.',
    )
  return path
}

export function e2bConfiguration(environment: LiveEnvironment, root: string) {
  const runId = `live-${randomUUID()}`
  const domain = required(environment, 'LIVE_E2B_DOMAIN')
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(domain))
    throw new CheckError('LIVE_E2B_DOMAIN must be the selected project domain.')
  const encryptionKey = required(environment, 'LIVE_E2B_STATE_KEY')
  if (Buffer.from(encryptionKey, 'base64').byteLength !== 32)
    throw new CheckError(
      'LIVE_E2B_STATE_KEY must encode 32 random bytes as Base64.',
    )
  return {
    runId,
    accountId: 'e2b-live-check',
    domain,
    encryptionKey,
    apiKey: required(environment, 'LIVE_E2B_KEY'),
    templateId: required(environment, 'LIVE_E2B_TEMPLATE_ID'),
    stateDirectory: contextPath(
      root,
      environment.LIVE_E2B_STATE_DIR ??
        '.context/e2b-backup-provider/live-state',
    ),
    output: contextPath(
      root,
      environment.LIVE_OUTPUT ?? `.context/e2b-backup-provider/${runId}`,
    ),
    software: readImageSoftware({
      url: required(environment, 'LIVE_RUNNER_ARCHIVE_URL'),
      sha256: required(environment, 'LIVE_RUNNER_ARCHIVE_SHA256'),
    }),
  }
}

export type E2bLiveConfiguration = ReturnType<typeof e2bConfiguration>

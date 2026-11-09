import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readReleaseCredentials } from './release-credentials.ts'

/** Do not include command arguments: some security commands contain passwords. */
function runReleaseTool(program: string, args: string[], env = process.env) {
  const result = spawnSync(program, args, { encoding: 'utf8', env })
  if (result.error || result.status !== 0)
    throw new Error(
      `${program} failed: ${result.error?.message ?? result.stderr ?? 'no output'}`,
    )
  return result.stdout
}

export async function withReleaseKeychain(
  action: (
    environment: NodeJS.ProcessEnv,
    teamId: string,
    signal: AbortSignal,
  ) => Promise<void>,
  run = runReleaseTool,
) {
  const credentials = readReleaseCredentials(process.env)
  const folder = await mkdtemp(
    join(process.env.RUNNER_TEMP ?? tmpdir(), 'conductive-release-'),
  )
  const keychain = join(folder, 'signing.keychain-db')
  const certificate = join(folder, 'signing.p12')
  const apiKey = join(folder, 'notarization.p8')
  const keychainPassword = randomBytes(36).toString('base64')
  const originalKeychains = run('security', ['list-keychains', '-d', 'user'])
    .split('\n')
    .map((line) => line.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
  let created = false
  const cancellation = new AbortController()
  const interrupt = () => cancellation.abort(new Error('Release cancelled'))
  process.on('SIGINT', interrupt)
  process.on('SIGTERM', interrupt)
  try {
    await writeFile(certificate, credentials.certificate, { mode: 0o600 })
    await writeFile(apiKey, credentials.apiKey, { mode: 0o600 })
    run('security', ['create-keychain', '-p', keychainPassword, keychain])
    created = true
    run('security', ['set-keychain-settings', '-lut', '21600', keychain])
    run('security', ['unlock-keychain', '-p', keychainPassword, keychain])
    run('security', [
      'list-keychains',
      '-d',
      'user',
      '-s',
      keychain,
      ...originalKeychains,
    ])
    run('security', [
      'import',
      certificate,
      '-k',
      keychain,
      '-P',
      credentials.password,
      '-T',
      '/usr/bin/codesign',
      '-T',
      '/usr/bin/productbuild',
    ])
    run('security', [
      'set-key-partition-list',
      '-S',
      'apple-tool:,apple:,codesign:',
      '-s',
      '-k',
      keychainPassword,
      keychain,
    ])
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) => !/^(CSC_|APPLE_)/.test(name),
      ),
    )
    await action(
      {
        ...environment,
        CSC_KEYCHAIN: keychain,
        CSC_IDENTITY_AUTO_DISCOVERY: 'true',
        APPLE_API_KEY: apiKey,
        APPLE_API_KEY_ID: credentials.keyId,
        APPLE_API_ISSUER: credentials.issuer,
      },
      credentials.teamId,
      cancellation.signal,
    )
    cancellation.signal.throwIfAborted()
  } finally {
    try {
      if (created) {
        try {
          run('security', [
            'list-keychains',
            '-d',
            'user',
            '-s',
            ...originalKeychains,
          ])
        } finally {
          run('security', ['delete-keychain', keychain])
        }
      }
    } finally {
      try {
        await rm(folder, { recursive: true, force: true })
      } finally {
        process.off('SIGINT', interrupt)
        process.off('SIGTERM', interrupt)
      }
    }
  }
}

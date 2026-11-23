import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { macDmgNames, productName } from '../../src/shared/brand.ts'
import { runReleaseCommand } from './release-command.ts'
import { withReleaseKeychain } from './release-keychain.ts'
import { retryAfterTimeLimit } from './release-retry.ts'
import { verifyReleaseApp } from './release-signature.ts'

if (process.platform !== 'darwin')
  throw new Error('Build signed Mac packages on macOS')
const desktop = resolve(import.meta.dirname, '..')
const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')
const release = resolve(desktop, 'dist/release')
const dmgArtifactName = macDmgNames.arm64.replace(
  /arm64\.dmg$/,
  '${arch}.${ext}',
)
// The release workflow signs each architecture in its own job, so Apple
// notarizes the two packages at the same time. Without a flag, one run
// builds both architectures.
const requested = (['arm64', 'x64'] as const).filter((architecture) =>
  process.argv.includes(`--${architecture}`),
)
const architectures =
  requested.length > 0 ? requested : (['arm64', 'x64'] as const)
// electron-builder puts the x64 app in `mac` and the arm64 app in `mac-arm64`.
const appFolders = { arm64: 'mac-arm64', x64: 'mac' } as const

await withReleaseKeychain(async (environment, teamId, signal) => {
  await runReleaseCommand(
    process.execPath,
    [resolve(desktop, 'scripts/icon.ts')],
    environment,
    signal,
    { inherit: true },
  )
  // electron-builder signs each app and waits for Apple to notarize it.
  await retryAfterTimeLimit(
    'Signing and notarizing the apps',
    signal,
    (limited) =>
      runReleaseCommand(
        resolve(desktop, 'node_modules/.bin/electron-builder'),
        [
          '--mac',
          ...architectures.map((architecture) => `--${architecture}`),
          '--publish',
          'never',
          '-c.forceCodeSigning=true',
          `-c.mac.identity=${teamId}`,
          '-c.mac.type=distribution',
          '-c.mac.hardenedRuntime=true',
          '-c.mac.notarize=true',
          '-c.mac.entitlements=entitlements.mac.plist',
          '-c.mac.entitlementsInherit=entitlements.mac.plist',
          `-c.dmg.artifactName=${dmgArtifactName}`,
          '-c.dmg.sign=true',
        ],
        environment,
        limited,
        { cwd: desktop, inherit: true },
      ),
  )
  await mkdir(evidence, { recursive: true })
  const signatures = []
  for (const architecture of architectures) {
    signatures.push(
      await verifyReleaseApp(
        resolve(release, appFolders[architecture], `${productName}.app`),
        teamId,
        environment,
        signal,
      ),
    )
  }
  await writeFile(
    resolve(evidence, 'desktop-release-signatures.json'),
    JSON.stringify(signatures, null, 2) + '\n',
  )
  const present = new Set(await readdir(release))
  const images = architectures.map((architecture) => macDmgNames[architecture])
  const missing = images.filter((name) => !present.has(name))
  if (missing.length > 0)
    throw new Error(`Missing release disk images: ${missing.join(', ')}`)
  for (const name of images) {
    const image = resolve(release, name)
    const { stdout: output } = await retryAfterTimeLimit(
      `Notarizing ${name}`,
      signal,
      (limited) =>
        runReleaseCommand(
          'xcrun',
          [
            'notarytool',
            'submit',
            image,
            '--key',
            environment.APPLE_API_KEY!,
            '--key-id',
            environment.APPLE_API_KEY_ID!,
            '--issuer',
            environment.APPLE_API_ISSUER!,
            '--wait',
            '--output-format',
            'json',
          ],
          environment,
          limited,
        ),
    )
    const submission: { id?: string; status?: string } = JSON.parse(output)
    await writeFile(
      resolve(evidence, `desktop-${name}-notarization.json`),
      output + '\n',
    )
    if (submission.status !== 'Accepted')
      throw new Error(
        `Apple did not accept ${name}; submission ${submission.id ?? 'unknown'}`,
      )
    await runReleaseCommand(
      'xcrun',
      ['stapler', 'staple', image],
      environment,
      signal,
    )
    await runReleaseCommand(
      'xcrun',
      ['stapler', 'validate', image],
      environment,
      signal,
    )
    await runReleaseCommand(
      'codesign',
      ['--verify', '--strict', image],
      environment,
      signal,
    )
    await runReleaseCommand(
      'spctl',
      [
        '--assess',
        '--type',
        'open',
        '--context',
        'context:primary-signature',
        '--verbose=2',
        image,
      ],
      environment,
      signal,
    )
    process.stdout.write(`Verified signed and notarized disk image: ${name}\n`)
  }
})

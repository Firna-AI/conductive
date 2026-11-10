import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { macDmgNames, productName } from '../../docs/mockups/src/brand.ts'
import { runReleaseCommand } from './release-command.ts'
import { withReleaseKeychain } from './release-keychain.ts'
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

await withReleaseKeychain(async (environment, teamId, signal) => {
  await runReleaseCommand(
    process.execPath,
    [resolve(desktop, 'scripts/icon.ts')],
    environment,
    signal,
    { inherit: true },
  )
  await runReleaseCommand(
    resolve(desktop, 'node_modules/.bin/electron-builder'),
    [
      '--mac',
      '--arm64',
      '--x64',
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
    signal,
    { cwd: desktop, inherit: true },
  )
  await mkdir(evidence, { recursive: true })
  const signatures = []
  for (const architecture of ['mac-arm64', 'mac']) {
    signatures.push(
      await verifyReleaseApp(
        resolve(release, architecture, `${productName}.app`),
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
  const images = (await readdir(release)).filter((name) =>
    name.endsWith('.dmg'),
  )
  if (images.length !== 2)
    throw new Error('Expected arm64 and x64 release disk images')
  for (const name of images) {
    const image = resolve(release, name)
    const { stdout: output } = await runReleaseCommand(
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
      signal,
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

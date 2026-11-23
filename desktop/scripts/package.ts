import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { productName } from '../../src/shared/brand.ts'

if (process.platform !== 'darwin') {
  throw new Error('Build the Mac DMG and ZIP packages on macOS')
}
const desktop = resolve(import.meta.dirname, '..')
if (process.argv.includes('--release')) {
  await import('./release.ts')
  process.exit(0)
}
// The packaged tests run only the package of this Mac's architecture.
// The release command builds the architectures that its flags name, or both.
const architecture = process.arch
if (architecture !== 'arm64' && architecture !== 'x64') {
  throw new Error('Build the Mac packages on an arm64 or x64 Mac')
}
const icon = spawnSync(
  process.execPath,
  [resolve(desktop, 'scripts/icon.ts')],
  { stdio: 'inherit' },
)
if (icon.error) throw icon.error
if (icon.status !== 0) process.exit(icon.status ?? 1)
const result = spawnSync(
  resolve(desktop, 'node_modules/.bin/electron-builder'),
  ['--mac', `--${architecture}`, '--publish', 'never'],
  {
    cwd: desktop,
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      // The configured identity is ad-hoc. PR builds need no certificate secrets.
      CSC_FOR_PULL_REQUEST: 'true',
    },
  },
)
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

const bundle = resolve(
  desktop,
  'dist/release',
  architecture === 'arm64' ? 'mac-arm64' : 'mac',
  `${productName}.app`,
)
const verification = spawnSync(
  'codesign',
  ['--verify', '--deep', '--strict', bundle],
  { encoding: 'utf8' },
)
const display = spawnSync('codesign', ['--display', '--verbose=4', bundle], {
  encoding: 'utf8',
})
const verifyOutput = (verification.stdout ?? '') + (verification.stderr ?? '')
const signatureDisplay = (display.stdout ?? '') + (display.stderr ?? '')
process.stdout.write(
  `Checking ${architecture} ad-hoc signature: ${bundle}\n${verifyOutput}${signatureDisplay}`,
)
const signature = {
  architecture,
  bundle,
  verifyStatus: verification.status,
  displayStatus: display.status,
  adhoc: /^Signature=adhoc\r?$/m.test(signatureDisplay),
  verifyOutput,
  signatureDisplay,
  toolError: verification.error?.message ?? display.error?.message,
}
const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')
await mkdir(evidence, { recursive: true })
// The evidence file keeps its list form, one entry for each packaged app.
await writeFile(
  resolve(evidence, 'desktop-signatures.json'),
  JSON.stringify([signature], null, 2) + '\n',
)
if (
  signature.verifyStatus !== 0 ||
  signature.displayStatus !== 0 ||
  !signature.adhoc
) {
  throw new Error(
    'Mac app signatures did not pass ad-hoc verification. See desktop-signatures.json.',
  )
}

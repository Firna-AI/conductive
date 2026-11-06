import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { productName } from '../../docs/mockups/src/brand.ts'

if (process.platform !== 'darwin') {
  throw new Error('Build the Mac DMG and ZIP packages on macOS')
}
const desktop = resolve(import.meta.dirname, '..')
const icon = spawnSync(
  process.execPath,
  [resolve(desktop, 'scripts/icon.ts')],
  { stdio: 'inherit' },
)
if (icon.error) throw icon.error
if (icon.status !== 0) process.exit(icon.status ?? 1)
const result = spawnSync(
  resolve(desktop, 'node_modules/.bin/electron-builder'),
  ['--mac', '--arm64', '--x64', '--publish', 'never'],
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

const signatures: {
  architecture: 'arm64' | 'x64'
  bundle: string
  verifyStatus: number | null
  displayStatus: number | null
  adhoc: boolean
  verifyOutput: string
  signatureDisplay: string
  toolError?: string
}[] = []
for (const architecture of ['arm64', 'x64'] as const) {
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
  signatures.push({
    architecture,
    bundle,
    verifyStatus: verification.status,
    displayStatus: display.status,
    adhoc: /^Signature=adhoc\r?$/m.test(signatureDisplay),
    verifyOutput,
    signatureDisplay,
    toolError: verification.error?.message ?? display.error?.message,
  })
}
const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')
await mkdir(evidence, { recursive: true })
await writeFile(
  resolve(evidence, 'desktop-signatures.json'),
  JSON.stringify(signatures, null, 2) + '\n',
)
if (
  signatures.some(
    (signature) =>
      signature.verifyStatus !== 0 ||
      signature.displayStatus !== 0 ||
      !signature.adhoc,
  )
) {
  throw new Error(
    'Mac app signatures did not pass ad-hoc verification. See desktop-signatures.json.',
  )
}

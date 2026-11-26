import { expect, it } from 'vitest'

import {
  runSoftwareStep,
  type ImageState,
} from './image-software-script.test-support'

const APT = [
  'apt-get -o Acquire::AllowReleaseInfoChange::Label=true update',
  'apt-get install -y ttyd tmux',
  'systemctl disable --now ttyd.service',
  'systemctl mask ttyd.service',
  'apt-get install -y gh',
]
const UPDATER = [
  'installed update check --bootstrap --server https://runner.conductive.test',
  'installed update apply',
  'installed update started',
]
const BOOTSTRAP = [
  'curl',
  'bootstrap update check --bootstrap --server https://runner.conductive.test',
  'bootstrap update apply',
  'installed update started',
]
const CURRENT: ImageState = {
  packages: ['ttyd', 'tmux', 'gh'],
  ttyd: 'masked',
  program: true,
  updater: 'works',
}

it('installs every package after a release Label change and bootstraps the program on the base image', async () => {
  const result = await runSoftwareStep(
    { packages: [], ttyd: 'enabled', program: false, updater: 'works' },
    'install',
  )
  expect(result.code).toBe(0)
  expect(result.calls).toEqual([...APT, ...BOOTSTRAP])
})

it('skips apt and updates through the installed program on a current image', async () => {
  const result = await runSoftwareStep(CURRENT, 'when-missing')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('The system packages are already installed.')
  expect(result.calls).toEqual(UPDATER)
})

it('runs apt when the image holds an older apt part', async () => {
  const result = await runSoftwareStep(CURRENT, 'install')
  expect(result.code).toBe(0)
  expect(result.calls).toEqual([...APT, ...UPDATER])
})

it.each([
  ['a package is missing', { ...CURRENT, packages: ['ttyd', 'tmux'] }],
  ['the ttyd service is not masked', { ...CURRENT, ttyd: 'enabled' as const }],
])('runs apt when %s', async (_name, state) => {
  const result = await runSoftwareStep(state, 'when-missing')
  expect(result.code).toBe(0)
  expect(result.calls).toEqual([...APT, ...UPDATER])
})

it.each(['fails', 'stale'] as const)(
  'downloads the full release when the installed updater %s',
  async (updater) => {
    const result = await runSoftwareStep(
      { ...CURRENT, updater },
      'when-missing',
    )
    expect(result.code).toBe(0)
    expect(result.stderr).toContain(
      'The installed updater did not get the release. Downloading the full release.',
    )
    expect(result.calls).toEqual([UPDATER[0], ...BOOTSTRAP])
  },
)

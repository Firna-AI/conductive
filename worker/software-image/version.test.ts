import { expect, it } from 'vitest'

import { SOFTWARE_RELEASE as SOFTWARE } from '../lifecycle/software-release-test-support'
import { installImageSoftware } from '../lifecycle/image-software'
import { WORKSPACE_TOOL_SOURCES } from '../tools/image-assets'
import { workspaceToolsCommands } from '../tools/image'
import { imageToolsCommand } from '../lifecycle/image-tools'
import { softwareVersion } from './version'

it('versions the release and exact install commands and changes with tool sources', async () => {
  const commands = [
    ...workspaceToolsCommands(WORKSPACE_TOOL_SOURCES).map(imageToolsCommand),
    SOFTWARE.version,
    installImageSoftware(SOFTWARE),
  ].join('\n')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(commands),
  )
  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  const version = await softwareVersion(SOFTWARE)
  expect(version).toBe(expected)
  expect(await softwareVersion({ ...SOFTWARE })).toBe(version)
  expect(
    await softwareVersion({
      ...SOFTWARE,
      url: 'https://software.conductive.test/new.tar.gz',
      sha256: 'b'.repeat(64),
    }),
  ).not.toBe(version)
  expect(await softwareVersion({ ...SOFTWARE, version: '0.0.43' })).not.toBe(
    version,
  )
  const sources = WORKSPACE_TOOL_SOURCES.map((source) => ({
    ...source,
    contents: `${source.contents}\n`,
  }))
  expect(await softwareVersion(SOFTWARE, sources)).not.toBe(version)
})

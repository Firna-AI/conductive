import { expect, it } from 'vitest'

import { SOFTWARE } from '../lifecycle/backend-test-support'
import { installImageSoftware } from '../lifecycle/image-software'
import { privilegedCommand } from '../terminal/privileged'
import { workspaceToolsCommand } from '../tools/image'
import { WORKSPACE_TOOL_SOURCES } from '../tools/image-assets'
import { softwareVersion } from './version'

it('versions the exact install commands and changes with archives and tool sources', async () => {
  const commands = `set -eu\n${privilegedCommand(workspaceToolsCommand(WORKSPACE_TOOL_SOURCES))}\n${installImageSoftware(SOFTWARE)}`
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
  const sources = WORKSPACE_TOOL_SOURCES.map((source) => ({
    ...source,
    contents: `${source.contents}\n`,
  }))
  expect(await softwareVersion(SOFTWARE, sources)).not.toBe(version)
})

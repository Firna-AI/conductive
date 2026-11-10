// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import type { FilesTab } from '../../../files/navigation'
import { filePaths } from '../../../shared/files'
import { byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_ORIGIN,
  FAKE_TIME,
} from '../../../test-support/fixtures/core'
import {
  FAKE_FILE_PATH,
  toolFixtures,
} from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { nextEnvelope } from '../../../test-support/recorded-repairs'
import { settle } from '../../test-mount'
import { openTab } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const data = toolFixtures()

/**
 * What the Worker answers to the read of a file or a diff while the agent
 * runner of a starting sandbox is not connected yet.
 */
const notReady = {
  error: {
    code: 'file_unavailable',
    message:
      'The file is not available. Try again when the cloud computer is ready.',
  },
}

const pages: { tab: FilesTab; route: string; reply: unknown }[] = [
  {
    tab: { kind: 'diff', path: FAKE_FILE_PATH },
    route: filePaths.diff(org, id, FAKE_FILE_PATH),
    reply: data.diff,
  },
  {
    tab: { kind: 'file', path: FAKE_FILE_PATH, mode: 'source' },
    route: filePaths.content(org, id, FAKE_FILE_PATH),
    reply: data.content,
  },
]

test.each(pages)(
  'show the sandbox in place of a $tab.kind page while it starts, and read the page once the sandbox is ready',
  async ({ tab, route, reply }) => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'starting' })
    server.json('GET', route, notReady, 503)
    const address = new URL(route, FAKE_ORIGIN).href
    const reads = () =>
      server.requests.filter((request) => request.url === address).length
    const { view } = await openTab(server, filesHref(org, id, tab))
    const page = () => byRole('region', 'AddressForm.tsx', view)

    expect(page().textContent).toContain('Waiting for the sandbox')
    expect(page().textContent).not.toContain("didn't open")
    expect(reads()).toBe(0)

    // The Worker connects the runner before the workspace turns ready.
    server.json('GET', route, reply)
    const { workspace } = workspaceFixtures().detail
    act(() =>
      server.events.emit(
        nextEnvelope(
          server.events,
          { type: 'workspace.updated', workspace },
          FAKE_TIME,
        ),
      ),
    )
    await settle()

    expect(page().textContent).not.toContain('Waiting for the sandbox')
    expect(page().textContent).toContain('return <form aria-label="Address" />')
    expect(reads()).toBe(1)
  },
)

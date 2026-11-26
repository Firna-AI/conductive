// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import { HeldRequests } from '../../../app/test-kit'
import type { FilesTab } from '../../../files/navigation'
import { filePaths } from '../../../shared/files'
import { workspacePaths } from '../../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryAllByRole,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_ORIGIN,
  FAKE_TIME,
} from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { nextEnvelope } from '../../../test-support/recorded-repairs'
import { routes } from '../../../app/router'
import { click, settle } from '../../test-mount'
import { headerStates } from '../header-test-kit'
import { linkTo, openTab } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const hookPath = 'src/app/checkout/useAddressAutocomplete.ts'
const formDiff: FilesTab = { kind: 'diff', path: FAKE_FILE_PATH }
const hookDiff: FilesTab = { kind: 'diff', path: hookPath }

/** The number of requests to `path`, a route of the fake API. */
function sent(server: FakeApiServer, method: string, path: string): number {
  const address = new URL(path, FAKE_ORIGIN).href
  return server.requests.filter(
    (request) => request.method === method && request.url === address,
  ).length
}

const resumes = (server: FakeApiServer) =>
  sent(server, 'POST', workspacePaths.resume(org, id))

test('resume a stopped sandbox at each open of a diff, also of the one that shows, but not again for the address that opened the workspace', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer({ workspaceState: 'stopped' })
  const { view } = await openTab(server, filesHref(org, id, formDiff))

  // The open of the workspace resumes it once, also at the address of a tab.
  expect(resumes(server)).toBe(1)

  const changes = byLabel('Changed files', byLabel('Files and tools', view))
  click(linkTo(changes, filesHref(org, id, hookDiff)))
  await settle()

  expect(resumes(server)).toBe(2)
  // The fake keeps the sandbox stopped, so the tab shows it in place of an
  // error, and reads nothing.
  const page = byRole('region', 'useAddressAutocomplete.ts', view)
  expect(page.textContent).toContain('Sandbox stopped')
  expect(page.textContent).not.toContain("didn't open")
  expect(sent(server, 'GET', filePaths.diff(org, id, hookPath))).toBe(0)
  expect(sent(server, 'GET', filePaths.diff(org, id, FAKE_FILE_PATH))).toBe(0)

  // A second click on the file that shows opens it again.
  click(linkTo(changes, filesHref(org, id, hookDiff)))
  await settle()

  expect(resumes(server)).toBe(3)
})

test('until the reply of the Resume that the open of a diff sends, the tab waits with no Resume, the header shows Starting, and nothing reads, and a failed Resume shows the stopped state again', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer({ workspaceState: 'stopped' })
  const held = new HeldRequests(server)
  const { view } = await openTab(server, filesHref(org, id, formDiff), {
    fetch: held.fetch,
  })
  const resumePath = workspacePaths.resume(org, id)
  // The open of the workspace resumed it. The Resume of the open of the
  // diff fails.
  server.json(
    'POST',
    resumePath,
    {
      error: {
        code: 'workspace_start_failed',
        message: "The cloud computer didn't start. Try again.",
      },
    },
    503,
  )
  const shown = () => ({
    page: byRole('region', 'useAddressAutocomplete.ts', view).textContent,
    resume: queryAllByRole('button', 'Resume', view).length,
    header: headerStates(view),
    reads: sent(server, 'GET', filePaths.diff(org, id, hookPath)),
  })

  held.holdAnswer('POST', resumePath)
  const changes = byLabel('Changed files', byLabel('Files and tools', view))
  click(linkTo(changes, filesHref(org, id, hookDiff)))
  await settle()
  const waiting = shown()
  held.release('POST', resumePath)
  await settle()

  // The header of the page keeps the path and the changed lines.
  const header = `${hookPath}+64`
  expect({ resumes: resumes(server), waiting, after: shown() }).toEqual({
    resumes: 2,
    waiting: {
      page: `${header}Waiting for the sandbox`,
      resume: 0,
      header: ['Starting'],
      reads: 0,
    },
    after: {
      page: `${header}Sandbox stoppedYour files and chat are saved.Resume`,
      resume: 1,
      header: ['Stopped'],
      reads: 0,
    },
  })
})

test.each([
  { state: 'stopped' as const, notice: 'Sandbox stopped' },
  { state: 'starting' as const, notice: 'Waiting for the sandbox' },
])(
  'keep the file that a tab shows when the sandbox is $state, and start nothing, also at a switch of its view',
  async ({ state, notice }) => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const tab: FilesTab = { kind: 'file', path: FAKE_FILE_PATH, mode: 'source' }
    const { view, navigation } = await openTab(server, filesHref(org, id, tab))
    const page = () => byRole('region', 'AddressForm.tsx', view)
    const route = filePaths.content(org, id, FAKE_FILE_PATH)
    const text = 'return <form aria-label="Address" />'
    expect(page().textContent).toContain(text)
    const reads = sent(server, 'GET', route)

    const { workspace } = workspaceFixtures().detail
    act(() =>
      server.events.emit(
        nextEnvelope(
          server.events,
          { type: 'workspace.updated', workspace: { ...workspace, state } },
          FAKE_TIME,
        ),
      ),
    )
    await settle()

    expect(page().textContent).toContain(text)
    expect(page().textContent).not.toContain(notice)
    expect(sent(server, 'GET', route)).toBe(reads)
    expect(resumes(server)).toBe(0)

    // A switch between the source and the preview keeps the tab open.
    act(() => navigation.push(filesHref(org, id, { ...tab, mode: 'preview' })))
    await settle()

    expect(resumes(server)).toBe(0)
  },
)

test.each([
  { name: 'ready', state: 'ready', refused: false, resumes: 0 },
  { name: 'refused', state: 'stopped', refused: true, resumes: 1 },
] as const)(
  'start nothing when a diff opens in a $name workspace',
  async (setup) => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: setup.state })
    if (setup.refused) {
      server.json(
        'POST',
        workspacePaths.resume(org, id),
        {
          error: { code: 'user_suspended', message: 'The owner is suspended.' },
        },
        403,
      )
    }
    const { navigation } = await openTab(server, routes.workspace(org, id))

    act(() => navigation.push(filesHref(org, id, formDiff)))
    await settle()

    // Only the open of a refused workspace tried its start, once.
    expect(resumes(server)).toBe(setup.resumes)
  },
)

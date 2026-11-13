import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { WorkspaceFiles } from '../model/files-store'
import type { FileListKind } from '../navigation'
import {
  filesAfterHistory,
  filesFor,
  slow,
  startFiles,
  testNavigation,
} from '../files-test-kit'
import { FilesPanel } from './FilesPanel'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The panel of a sandbox that starts, with its wait for a list. */
function starting(files: WorkspaceFiles, list: FileListKind): string {
  return text(
    renderToStaticMarkup(
      <FilesPanel
        activeTab={null}
        files={files}
        layout="desktop"
        list={list}
        navigation={testNavigation()}
        waiting={<p>Waiting for the sandbox</p>}
      />,
    ),
  )
}

it(
  'shows the wait in place of a list without a saved copy, and the saved copy of each other list',
  slow,
  async () => {
    const server = new FakeApiServer()
    server.json('GET', filePaths.tree(org, id), {
      revision: 0,
      entries: [],
      unavailable: true,
    })
    server.json(
      'GET',
      filePaths.changes(org, id),
      { error: { code: 'file_unavailable', message: 'Starting.' } },
      503,
    )
    const unsaved = filesAfterHistory(server)
    await startFiles(unsaved)
    expect(starting(unsaved, 'all')).toMatch(/Waiting for the sandbox$/)
    expect(starting(unsaved, 'changes')).toMatch(/Waiting for the sandbox$/)

    const saved = filesFor(new FakeApiServer())
    await startFiles(saved)
    expect(starting(saved, 'all')).toContain('package.json')
    expect(starting(saved, 'all')).not.toContain('Waiting for the sandbox')
  },
)

it.each([
  { held: 'all', failed: 'changes' },
  { held: 'changes', failed: 'all' },
] as const)(
  'shows the load of a saved $held list and the Try again of a failed $failed list while the sandbox starts',
  slow,
  async ({ held, failed }) => {
    const server = new FakeApiServer()
    const path = { all: filePaths.tree, changes: filePaths.changes }
    server.json(
      'GET',
      path[failed](org, id),
      { error: { code: 'internal', message: 'Broken.' } },
      500,
    )
    let release = () => {}
    const reply = new Promise<void>((resolve) => (release = resolve))
    const heldPath = path[held](org, id)
    const files = filesAfterHistory(server, async (input, init) => {
      if (new URL(input, 'http://app.test').pathname === heldPath) {
        await reply
      }
      return server.fetch(input, init)
    })
    files.start()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const loading = held === 'all' ? 'Loading files' : 'Loading changes'
    expect(starting(files, held)).toMatch(new RegExp(`${loading}$`))
    expect(starting(files, failed)).toContain('didn&#x27;t load Try again')
    release()
    files.stop()
  },
)

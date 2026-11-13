import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import type { WorkspaceTab } from '../../shared/workspace-view'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import {
  nextEnvelope,
  refusedReport,
} from '../../test-support/recorded-repairs'
import type { WorkspaceFiles } from '../model/files-store'
import type { FileListKind } from '../navigation'
import {
  filesAfterHistory,
  filesFor,
  heldTree,
  slow,
  startFiles,
  testNavigation,
} from '../files-test-kit'
import { FilesPanel } from './FilesPanel'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

/**
 * Renders the panel after the store has read the routes. The stream starts
 * after its recorded events, unless `replay` reads them too.
 */
async function panel(
  server: FakeApiServer,
  list: FileListKind,
  activeTab: WorkspaceTab | null = null,
  replay = false,
  now?: () => number,
) {
  const files = replay
    ? filesFor(server)
    : filesFor(server, (after, listener) =>
        server.events.subscribe(
          Math.max(after, server.events.history().throughEventNumber),
          listener,
        ),
      )
  await startFiles(files)
  return render(files, list, activeTab, now)
}

function render(
  files: WorkspaceFiles,
  list: FileListKind,
  activeTab: WorkspaceTab | null = null,
  now?: () => number,
) {
  return renderToStaticMarkup(
    <FilesPanel
      activeTab={activeTab}
      files={files}
      layout="desktop"
      list={list}
      navigation={testNavigation()}
      now={now}
    />,
  )
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

it(
  'shows the totals of the API in the summary and the tab count',
  slow,
  async () => {
    const server = new FakeApiServer()
    server.json('GET', filePaths.changes(org, id), {
      baseBranch: 'main',
      files: [
        {
          path: 'a.ts',
          change: 'added',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
        {
          path: 'b.ts',
          change: 'modified',
          added: 2,
          removed: 1,
          uncommitted: false,
        },
      ],
      summary: { files: 12, added: 300, removed: 7 },
    })
    const html = await panel(server, 'changes')
    expect(text(html)).toContain('Changes 12')
    expect(text(html)).toContain('12 files changed +300 −7')
  },
)

it(
  'links file rows to file tabs, changed rows to diffs, and marks the open row',
  slow,
  async () => {
    const server = new FakeApiServer()
    const all = await panel(server, 'all', {
      kind: 'file',
      path: 'README.md',
      mode: 'source',
    })
    expect(all).toMatch(
      /<a aria-current="page" class="[^"]*" href="\/file\/source\/README.md"/,
    )
    expect(all).toContain(
      'href="/file/preview/src/app/checkout/AddressForm.tsx"',
    )
    expect(all).toMatch(
      /<button aria-expanded="true" class="[^"]*"[^>]*><svg[^>]*lucide-chevron-down/,
    )
    expect(all).toMatch(/<button aria-expanded="false"[^>]*>.*?\.github/)
    expect(all).toMatch(
      /AddressForm\.tsx<\/span><svg [^>]*aria-label="Modified"/,
    )
    const changes = await panel(server, 'changes', {
      kind: 'diff',
      path: 'src/app/checkout/AddressForm.tsx',
    })
    expect(changes).toMatch(
      /<a aria-current="page" class="[^"]*" href="\/diff\/src\/app\/checkout\/AddressForm.tsx"/,
    )
    expect(changes).toContain('href="/diff/src/app/checkout/postcodeLookup.ts"')
    expect(changes).toContain('aria-label="Deleted"')
  },
)

it(
  'offers Try again when the tree does not load, and shows empty changes',
  slow,
  async () => {
    const server = new FakeApiServer()
    server.json(
      'GET',
      filePaths.tree(org, id),
      { error: { code: 'file_unavailable', message: 'Busy.' } },
      503,
    )
    server.json('GET', filePaths.changes(org, id), {
      baseBranch: 'main',
      files: [],
      summary: { files: 0, added: 0, removed: 0 },
    })
    expect(text(await panel(server, 'all'))).toContain(
      'The files didn&#x27;t load Try again',
    )
    expect(text(await panel(server, 'changes'))).toContain(
      'Changes show here Files that the agent edits appear as it works.',
    )
  },
)

it(
  'keeps a saved tree under its notice when the files could not be read, and names a list that no tree saved',
  slow,
  async () => {
    const server = new FakeApiServer()
    const tree = filePaths.tree(org, id)
    server.json('GET', tree, { ...toolFixtures().files, unavailable: true })
    const saved = text(await panel(server, 'all'))
    expect(saved).toContain('package.json')
    expect(saved).toMatch(/ The latest list of all files is unavailable$/)

    server.json('GET', tree, { revision: 0, entries: [], unavailable: true })
    const none = text(await panel(server, 'all'))
    const unread =
      /Checks The list of all files is unavailable The list shows after a successful read\.$/
    expect(none).toMatch(unread)
    expect(none).not.toContain('Files show here')

    // A live mark arrives while the first reply of the tree route waits.
    const held = heldTree(server)
    const files = filesAfterHistory(server, held.fetch)
    files.start()
    server.events.emit(
      nextEnvelope(server.events, { type: 'files.unavailable' }, FAKE_TIME),
    )
    expect(text(render(files, 'all'))).toMatch(unread)
    files.stop()
    held.release()
  },
)

/** The opening tag of the change mark with this accessible name. */
function mark(html: string, label: string): string {
  return (
    html.match(new RegExp(`<svg [^>]*aria-label="${label}"[^>]*>`))?.[0] ?? ''
  )
}

it(
  'marks a renamed file with the modified square and its old path, and an untracked file with the added square',
  slow,
  async () => {
    const html = await panel(new FakeApiServer(), 'changes', null, true)
    expect(mark(html, 'Renamed from README.md')).toContain('lucide-square-dot')
    expect(mark(html, 'Modified')).toContain('lucide-square-dot')
    expect(mark(html, 'Untracked')).toContain('lucide-square-plus')
    expect(mark(html, 'Added')).toContain('lucide-square-plus')
  },
)

it(
  'shows a notice of each list whose fresh report was lost too, under the lists',
  slow,
  async () => {
    const server = new FakeApiServer()
    const minute = 60_000
    const emit = (event: WorkspaceEvent, at: number) =>
      server.events.emit(nextEnvelope(server.events, event, at))
    const now = () => FAKE_TIME
    // The first loss asks for a fresh report, and nothing shows.
    emit(refusedReport('changes.updated', false), FAKE_TIME - 9 * minute)
    const quiet = await panel(server, 'changes', null, true, now)
    expect(text(quiet)).not.toContain('unavailable')
    emit(refusedReport('changes.updated', true), FAKE_TIME - 4 * minute)
    emit(refusedReport('files.snapshot', true), FAKE_TIME - 3 * minute)
    const html = await panel(server, 'changes', null, true, now)
    expect(text(html)).toMatch(
      / files changed .* The latest list of all files is unavailable 3m ago The latest list of changes is unavailable 4m ago$/,
    )
    expect(html.match(/role="status"/g)).toHaveLength(2)
  },
)

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

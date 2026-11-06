import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import type { WorkspaceTab } from '../../shared/workspace-view'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { FileListKind } from '../navigation'
import { filesFor, slow, startFiles, testNavigation } from '../files-test-kit'
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
  return renderToStaticMarkup(
    <FilesPanel
      activeTab={activeTab}
      files={files}
      layout="desktop"
      list={list}
      navigation={testNavigation()}
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

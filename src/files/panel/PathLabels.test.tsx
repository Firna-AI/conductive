import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { filesFor, slow, startFiles, testNavigation } from '../files-test-kit'
import type { FileListKind } from '../navigation'
import { FilesPanel } from './FilesPanel'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

/** The panel after the store read the routes, as static markup. */
async function panel(server: FakeApiServer, list: FileListKind) {
  const files = filesFor(server, (after, listener) =>
    server.events.subscribe(
      Math.max(after, server.events.history().throughEventNumber),
      listener,
    ),
  )
  await startFiles(files)
  return renderToStaticMarkup(
    <FilesPanel
      activeTab={null}
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

/** The opening tag of the change mark with this accessible name. */
function mark(html: string, label: string): string {
  return (
    html.match(new RegExp(`<svg [^>]*aria-label="${label}"[^>]*>`))?.[0] ?? ''
  )
}

/** The addresses of the links of a list, in their order. */
function targets(html: string): string[] {
  return [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((match) => match[1])
}

/** The markup that a person reads: the text and the names, no address. */
function shown(html: string): string {
  return html.replace(/ href="[^"]*"/g, '')
}

it(
  'shows the label of a path that holds a secret value, and keeps each real path as its own row and target',
  slow,
  async () => {
    // Secret values "1" and "2" give two real paths one label.
    const server = new FakeApiServer()
    const label = 'tests/test[redacted].ts'
    server.json('GET', filePaths.tree(org, id), {
      revision: 1,
      entries: [
        { path: 'tests', name: 'tests', kind: 'directory', change: null },
        ...['tests/test1.ts', 'tests/test2.ts'].map((path) => ({
          path,
          displayPath: label,
          name: 'test[redacted].ts',
          kind: 'file',
          change: 'added',
        })),
      ],
    })
    server.json('GET', filePaths.changes(org, id), {
      baseBranch: 'main',
      files: [
        {
          path: 'tests/test1.ts',
          displayPath: label,
          change: 'added',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
        {
          path: 'tests/test2.ts',
          displayPath: label,
          previousPath: 'old/test2.ts',
          previousDisplayPath: 'old/test[redacted].ts',
          change: 'renamed',
          added: 2,
          removed: 0,
          uncommitted: false,
        },
      ],
      summary: { files: 2, added: 3, removed: 0 },
    })
    const all = await panel(server, 'all')
    const changes = await panel(server, 'changes')
    expect({
      allTargets: targets(all).filter((href) => href.includes('test')),
      allText: text(all),
      changeTargets: targets(changes).filter((href) =>
        href.startsWith('/diff/'),
      ),
      changeText: text(changes),
      renamed: mark(changes, 'Renamed from old/test\\[redacted\\].ts') !== '',
      leaks: [shown(all), shown(changes)].some((html) =>
        /test[12]\.ts/.test(html),
      ),
    }).toEqual({
      allTargets: [
        '/file/preview/tests/test1.ts',
        '/file/preview/tests/test2.ts',
      ],
      allText:
        'All files Changes 2 Checks tests test[redacted].ts test[redacted].ts',
      changeTargets: ['/diff/tests/test1.ts', '/diff/tests/test2.ts'],
      changeText:
        'All files Changes 2 Checks 2 files changed +3 tests/ test[redacted].ts +1 tests/ test[redacted].ts +2',
      renamed: true,
      leaks: false,
    })
  },
)

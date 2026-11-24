import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import type { FileListKind } from '../navigation'
import {
  filesAfterHistory,
  slow,
  startFiles,
  testNavigation,
} from '../files-test-kit'
import { FilesPanel } from './FilesPanel'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

/** The markup of the panel after the store read the routes of the lists. */
async function panel(server: FakeApiServer, list: FileListKind) {
  const files = filesAfterHistory(server)
  await startFiles(files)
  const html = renderToStaticMarkup(
    <FilesPanel
      activeTab={null}
      files={files}
      layout="desktop"
      list={list}
      navigation={testNavigation()}
    />,
  )
  files.stop()
  return html
}

/** The text of the panel after its tabs. */
function body(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^All files Changes( [\d,]+)? Checks ?/, '')
}

const { files: tree, changes } = toolFixtures()
const totals = { files: 1_243, added: 31_004, removed: 9_877 }
const none = { files: 0, added: 0, removed: 0 }

it.each([
  {
    list: 'all',
    report: 'that leaves out 18,412 entries',
    reply: { ...tree, omittedEntryCount: 18_412 },
    shown:
      '18,412 files and folders are not listed. Find them in the terminal, or ask the agent. .context .github',
  },
  {
    list: 'all',
    report: 'that leaves out one entry',
    reply: { ...tree, omittedEntryCount: 1 },
    shown:
      '1 file or folder is not listed. Find it in the terminal, or ask the agent. .context .github',
  },
  {
    list: 'all',
    report: 'that leaves out none',
    reply: { ...tree, omittedEntryCount: 0 },
    shown: '.context',
  },
  {
    list: 'all',
    report: 'without an omitted count',
    reply: tree,
    shown: '.context',
  },
  {
    list: 'all',
    report: 'that lists no entry and leaves out 3',
    reply: { revision: 4, entries: [], omittedEntryCount: 3 },
    shown:
      '3 files and folders are not listed. Find them in the terminal, or ask the agent.',
  },
  {
    list: 'changes',
    report: 'that leaves out one file',
    reply: { ...changes, omitted: { files: 1, added: 12, removed: 3 } },
    shown:
      '6 files changed +170 −51 The totals include 1 file that is not listed. Review it in the terminal, or ask the agent. src/app/checkout/ useAddressAutocomplete.ts',
  },
  {
    list: 'changes',
    report: 'that leaves out no file',
    reply: { ...changes, omitted: none },
    shown:
      '5 files changed +158 −48 src/app/checkout/ useAddressAutocomplete.ts',
  },
  {
    list: 'changes',
    report: 'that lists no file and leaves out 1,243',
    reply: { ...changes, files: [], summary: none, omitted: totals },
    shown:
      '1,243 files changed +31,004 −9,877 The totals include 1,243 files that are not listed. Review them in the terminal, or ask the agent.',
  },
] as const)(
  'draws the $list list of a report $report, with the count of the report in its notice',
  slow,
  async ({ list, reply, shown }) => {
    const server = new FakeApiServer()
    const route = list === 'all' ? filePaths.tree : filePaths.changes
    server.json('GET', route(org, id), reply)
    const text = body(await panel(server, list))
    expect(text.startsWith(shown), text).toBe(true)
    // A limited list is no empty branch, also when it lists nothing.
    expect(text).not.toMatch(/show here/)
  },
)

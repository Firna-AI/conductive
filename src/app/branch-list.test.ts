import { describe, expect, test } from 'vitest'
import {
  repositoryBranchesPath,
  type WorkspaceBranchOption,
} from '../shared/workspace-branches'
import { FakeApiServer } from '../test-support/fake-api'
import { branchFixtures } from '../test-support/fixtures/branches'
import { FAKE_IDS } from '../test-support/fixtures/core'
import {
  BRANCH_SEARCH_PAUSE_MS,
  BranchList,
  branchPagePath,
  type BranchListState,
} from './branch-list'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  requestLines,
  testServices,
} from './test-kit'

const org = FAKE_IDS.org
const storefront = { id: 'storefront', fullName: 'acme/storefront' }
const billing = { id: 'billing-service', fullName: 'acme/billing-service' }
const rows = branchFixtures({ ...storefront, githubId: 1 })
const billingRows = branchFixtures({ ...billing, githubId: 2 }).slice(3)
const unavailable = {
  error: {
    code: 'github_unavailable',
    message: 'GitHub is not available. Try again.',
  },
}

/** The path of one page of a list, as the list asks for it. */
const pageOf = (
  query: string,
  cursor: string | null = null,
  repository = storefront.id,
) => branchPagePath(org, repository, query, cursor)

/** The list over the fake API, with a pause that runs when the test says. */
function listOver(server: FakeApiServer, held?: HeldRequests) {
  const delay = new ManualDelay()
  const services = testServices(server, {
    delay: delay.delay,
    ...(held ? { fetch: held.fetch } : {}),
  })
  return { list: new BranchList(services, org), delay }
}

/** The pages of the lists that the server got, in their order. */
function reads(server: FakeApiServer): string[] {
  const lists = [storefront, billing].map((item) =>
    repositoryBranchesPath(org, item.id),
  )
  return requestLines(server)
    .map((line) => line.replace(/^GET /, ''))
    .filter((path) => lists.some((list) => path.startsWith(list)))
}

/** A row as a person reads it: a branch by its name, a pull request by its number. */
const nameOf = (row: WorkspaceBranchOption) =>
  row.type === 'branch' ? row.name : `#${row.number}`

/** What the list shows: the text of the field, and its rows or its state. */
function shown(state: BranchListState) {
  const { text, rows: list } = state
  if (list.state === 'loading') return { text, rows: 'loading' }
  if (list.state === 'failed') return { text, failed: list.error.code }
  const { more } = list
  return {
    text,
    query: list.query,
    rows: list.rows.map(nameOf),
    more: more.state === 'failed' ? `failed ${more.error.code}` : more.state,
  }
}

const allRows = ['#486', '#482', '#477', ...rows.slice(3).map(nameOf)]

describe('BranchList', () => {
  test('the first rows load when the picker opens, and a reopen shows them again without a read', async () => {
    const server = new FakeApiServer()
    server.json('GET', pageOf(''), { rows, nextCursor: null })
    const { list } = listOver(server)
    list.open(storefront.id)
    const opening = shown(list.state.get())
    await flushMicrotasks()
    list.stop()
    list.open(storefront.id)
    expect({
      opening,
      reopened: shown(list.state.get()),
      reads: reads(server),
    }).toEqual({
      opening: { text: '', rows: 'loading' },
      reopened: { text: '', query: '', rows: allRows, more: 'none' },
      reads: [pageOf('')],
    })
  })

  test('first rows that did not load show the error, and a reopen or Try again reads them again', async () => {
    const server = new FakeApiServer()
    server.json('GET', pageOf(''), unavailable, 502)
    const { list } = listOver(server)
    list.open(storefront.id)
    await flushMicrotasks()
    const failed = shown(list.state.get())
    list.stop()
    list.open(storefront.id)
    await flushMicrotasks()
    const reopened = shown(list.state.get())
    server.json('GET', pageOf(''), { rows, nextCursor: null })
    await list.retry()
    expect({
      failed,
      reopened,
      retried: shown(list.state.get()),
      reads: reads(server).length,
    }).toEqual({
      failed: { text: '', failed: 'github_unavailable' },
      reopened: { text: '', failed: 'github_unavailable' },
      retried: { text: '', query: '', rows: allRows, more: 'none' },
      reads: 3,
    })
  })

  test('a search waits for a pause in the typing and sends its trimmed text, and the answer of an older search changes nothing', async () => {
    const server = new FakeApiServer()
    server.json('GET', pageOf(''), { rows, nextCursor: null })
    server.json('GET', pageOf('gift'), {
      rows: rows.slice(0, 1),
      nextCursor: null,
    })
    server.json('GET', pageOf('tax'), { rows: [], nextCursor: null })
    const held = new HeldRequests(server)
    const { list, delay } = listOver(server, held)
    list.open(storefront.id)
    await flushMicrotasks()
    list.search('gi')
    list.search(' gift ')
    const typing = { shown: shown(list.state.get()), pauses: delay.waits }
    held.holdAnswer('GET', repositoryBranchesPath(org, storefront.id))
    await delay.runAll()
    await flushMicrotasks()
    list.search('tax')
    await delay.runAll()
    await flushMicrotasks()
    held.release('GET', repositoryBranchesPath(org, storefront.id))
    await flushMicrotasks()
    expect({
      typing,
      shown: shown(list.state.get()),
      reads: reads(server),
    }).toEqual({
      typing: {
        shown: { text: ' gift ', rows: 'loading' },
        pauses: [BRANCH_SEARCH_PAUSE_MS],
      },
      shown: { text: 'tax', query: 'tax', rows: [], more: 'none' },
      reads: [pageOf(''), pageOf('gift'), pageOf('tax')],
    })
  })

  test('a page that a search leaves empty does not end the list: the list follows its cursor, and says that nothing matches only at the end', async () => {
    const server = new FakeApiServer()
    server.json('GET', pageOf(''), { rows, nextCursor: null })
    server.json('GET', pageOf('polish'), { rows: [], nextCursor: 'p2' })
    server.json('GET', pageOf('polish', 'p2'), {
      rows: rows.slice(2, 3),
      nextCursor: 'p3',
    })
    server.json('GET', pageOf('tax'), { rows: [], nextCursor: 't2' })
    server.json('GET', pageOf('tax', 't2'), { rows: [], nextCursor: null })
    const { list } = listOver(server)
    list.open(storefront.id)
    await flushMicrotasks()
    list.search('polish')
    list.searchNow()
    await flushMicrotasks()
    const fork = shown(list.state.get())
    list.search('tax')
    list.searchNow()
    await flushMicrotasks()
    expect({
      fork,
      none: shown(list.state.get()),
      reads: reads(server),
    }).toEqual({
      fork: { text: 'polish', query: 'polish', rows: ['#477'], more: 'ready' },
      none: { text: 'tax', query: 'tax', rows: [], more: 'none' },
      reads: [
        pageOf(''),
        pageOf('polish'),
        pageOf('polish', 'p2'),
        pageOf('tax'),
        pageOf('tax', 't2'),
      ],
    })
  })

  test('Show more adds the next page under the rows, each row once, and Try again loads a page that failed', async () => {
    const server = new FakeApiServer()
    server.json('GET', pageOf(''), { rows: rows.slice(0, 4), nextCursor: 'n2' })
    server.json('GET', pageOf('', 'n2'), unavailable, 502)
    const { list } = listOver(server)
    list.open(storefront.id)
    await flushMicrotasks()
    const first = shown(list.state.get())
    await list.more()
    const failed = shown(list.state.get())
    // The next page starts with the last row of the first page again.
    server.json('GET', pageOf('', 'n2'), {
      rows: rows.slice(3),
      nextCursor: null,
    })
    await list.retry()
    expect({ first, failed, more: shown(list.state.get()) }).toEqual({
      first: { text: '', query: '', rows: allRows.slice(0, 4), more: 'ready' },
      failed: {
        text: '',
        query: '',
        rows: allRows.slice(0, 4),
        more: 'failed github_unavailable',
      },
      more: { text: '', query: '', rows: allRows, more: 'none' },
    })
  })

  test('a close stops the pause of a search and the pages of an empty search, keeps the search, and a reopen reads it again', async () => {
    const server = new FakeApiServer()
    server.json('GET', pageOf(''), { rows, nextCursor: null })
    server.json('GET', pageOf('tax'), { rows: [], nextCursor: 't2' })
    server.json('GET', pageOf('tax', 't2'), { rows: [], nextCursor: null })
    const held = new HeldRequests(server)
    const { list, delay } = listOver(server, held)
    list.open(storefront.id)
    await flushMicrotasks()
    list.search('tax')
    list.stop()
    const paused = { pauses: delay.pending, reads: reads(server).length }
    // The first page of the search waits while the picker closes.
    held.holdAnswer('GET', repositoryBranchesPath(org, storefront.id))
    list.open(storefront.id)
    await flushMicrotasks()
    list.stop()
    held.release('GET', repositoryBranchesPath(org, storefront.id))
    await flushMicrotasks()
    const closed = { shown: shown(list.state.get()), reads: reads(server) }
    server.json('GET', pageOf('tax'), { rows: [], nextCursor: null })
    list.open(storefront.id)
    await flushMicrotasks()
    expect({ paused, closed, reopened: shown(list.state.get()) }).toEqual({
      paused: { pauses: 0, reads: 1 },
      closed: {
        shown: { text: 'tax', rows: 'loading' },
        reads: [pageOf(''), pageOf('tax')],
      },
      reopened: { text: 'tax', query: 'tax', rows: [], more: 'none' },
    })
  })

  test('another repository starts an empty search, and the answer for the repository before changes nothing', async () => {
    const server = new FakeApiServer()
    server.json('GET', pageOf(''), { rows, nextCursor: null })
    server.json('GET', pageOf('oslo'), {
      rows: rows.slice(3, 4),
      nextCursor: null,
    })
    server.json('GET', pageOf('', null, billing.id), {
      rows: billingRows,
      nextCursor: null,
    })
    const held = new HeldRequests(server)
    const { list } = listOver(server, held)
    list.open(storefront.id)
    await flushMicrotasks()
    held.holdAnswer('GET', repositoryBranchesPath(org, storefront.id))
    list.search('oslo')
    list.searchNow()
    await flushMicrotasks()
    list.open(billing.id)
    await flushMicrotasks()
    held.release('GET', repositoryBranchesPath(org, storefront.id))
    await flushMicrotasks()
    expect(shown(list.state.get())).toEqual({
      text: '',
      query: '',
      rows: billingRows.map(nameOf),
      more: 'none',
    })
  })
})

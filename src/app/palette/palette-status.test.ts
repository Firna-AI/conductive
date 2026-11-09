import { describe, expect, test } from 'vitest'
import { ApiError } from '../api/client'
import { loading, type Loadable } from '../store'
import { paletteResults, type PaletteResults } from './palette-results'
import type { PaletteQuery, PaletteSource } from './palette-source'
import { query, source } from './results-test-kit'

/** A read that the server refused before any read of it succeeded. */
const failed: Loadable<never> = {
  state: 'failed',
  error: new ApiError(503, 'unavailable', 'The service is busy.'),
}

interface Shown {
  status:
    | 'loading'
    | null
    | { title: string; error: string; retry: readonly string[] }
  groups: string[]
  empty: PaletteResults['empty']
}

/** The status part, the labels of the groups, and the empty state. */
function shownWithStatus(results: PaletteResults): Shown {
  const { status } = results
  return {
    status:
      status === null || status.kind === 'loading'
        ? (status?.kind ?? null)
        : {
            title: status.title,
            error: status.error.message,
            retry: status.retry,
          },
    groups: results.groups.map((group) => group.label),
    empty: results.empty,
  }
}

const listFailed = {
  title: "The workspaces didn't load",
  error: 'The service is busy.',
  retry: ['list'],
}

const namesFailed = {
  title: "The repositories didn't load",
  error: 'The service is busy.',
  retry: ['repositories'],
}

const actionsAndSettings = ['Actions', 'Settings']

describe('the status part of the palette', () => {
  test.each<{
    state: string
    query: Partial<PaletteQuery>
    source: Partial<PaletteSource>
    shown: Shown
  }>([
    {
      state: 'the list loads, with an empty field',
      query: {},
      source: { list: loading },
      shown: { status: 'loading', groups: actionsAndSettings, empty: null },
    },
    {
      state: 'the list loads, with a query',
      query: { text: 'fi' },
      source: { list: loading },
      shown: { status: 'loading', groups: ['Actions'], empty: null },
    },
    {
      state: 'the list failed, with an empty field',
      query: {},
      source: { list: failed },
      shown: { status: listFailed, groups: actionsAndSettings, empty: null },
    },
    {
      state: 'the list failed, with a query',
      query: { text: 'fi' },
      source: { list: failed },
      shown: { status: listFailed, groups: ['Actions'], empty: null },
    },
    {
      state: 'the names load, with an empty field',
      query: {},
      source: { repositories: loading },
      shown: {
        status: null,
        groups: ['Recent workspaces', ...actionsAndSettings],
        empty: null,
      },
    },
    {
      state: 'the names load, with a query that matches only a repository',
      query: { text: 'billing' },
      source: { repositories: loading },
      shown: { status: 'loading', groups: [], empty: null },
    },
    {
      state: 'the names failed, with an empty field',
      query: {},
      source: { repositories: failed },
      shown: {
        status: null,
        groups: ['Recent workspaces', ...actionsAndSettings],
        empty: null,
      },
    },
    {
      state: 'the names failed, with a query',
      query: { text: 'fi' },
      source: { repositories: failed },
      shown: { status: namesFailed, groups: ['Actions'], empty: null },
    },
    {
      state: 'the list failed while the names load',
      query: { text: 'fi' },
      source: { list: failed, repositories: loading },
      shown: { status: listFailed, groups: ['Actions'], empty: null },
    },
    {
      state: 'the names failed while the list loads',
      query: { text: 'fi' },
      source: { list: loading, repositories: failed },
      shown: { status: namesFailed, groups: ['Actions'], empty: null },
    },
    {
      state: 'both reads failed',
      query: { text: 'fi' },
      source: { list: failed, repositories: failed },
      shown: {
        status: { ...listFailed, retry: ['list', 'repositories'] },
        groups: ['Actions'],
        empty: null,
      },
    },
    {
      state: 'a search over loaded data finds no row',
      query: { text: 'refund' },
      source: {},
      shown: {
        status: null,
        groups: [],
        empty: { kind: 'no-match', query: 'refund' },
      },
    },
    {
      state: 'the list loads on the Workspaces tab',
      query: { tab: 'workspaces' },
      source: { list: loading },
      shown: { status: 'loading', groups: [], empty: null },
    },
    {
      state: 'the names load on the Workspaces tab, with an empty field',
      query: { tab: 'workspaces' },
      source: { repositories: loading },
      shown: {
        status: null,
        groups: ['General', 'Checkout', 'Infra'],
        empty: null,
      },
    },
    {
      state: 'the list failed on the Actions tab',
      query: { tab: 'actions', text: 'refund' },
      source: { list: failed },
      shown: {
        status: null,
        groups: [],
        empty: { kind: 'no-match', query: 'refund' },
      },
    },
  ])('$state', ({ query: chosen, source: read, shown }) => {
    expect(
      shownWithStatus(paletteResults(query(chosen), source(read))),
    ).toEqual(shown)
  })
})

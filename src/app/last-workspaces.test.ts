import { describe, expect, test } from 'vitest'
import type { OrgSummary } from '../shared/orgs'
import {
  LastWorkspaces,
  orgEntry,
  startPage,
  type WorkspaceRoute,
} from './last-workspaces'
import type { KeyValueStorage } from './services'
import { MemoryStorage } from './test-kit'

const key = 'conductive.last-workspaces.cal'

function workspace(
  orgId: string,
  workspaceId: string,
  more: Partial<WorkspaceRoute> = {},
): WorkspaceRoute {
  return { screen: 'workspace', orgId, workspaceId, view: [], ...more }
}

function memory(storage: KeyValueStorage | null, person = 'cal') {
  const last = new LastWorkspaces(storage)
  last.follow(person)
  return last
}

/** A browser that refuses its storage, as some private windows do. */
const refusing: KeyValueStorage = {
  getItem: () => {
    throw new Error('The storage is not available.')
  },
  setItem: () => {
    throw new Error('The storage is not available.')
  },
}

describe('LastWorkspaces', () => {
  test('a switch opens the last workspace of the org, with its view or session', () => {
    const last = memory(new MemoryStorage())
    last.remember(workspace('acme', 'ws-1', { view: ['files'] }))
    last.remember(workspace('firna', 'ws-2', { session: 's 1' }))
    const state = last.state.get()
    expect(orgEntry(state, 'acme')).toBe('/orgs/acme/workspaces/ws-1/files')
    expect(orgEntry(state, 'firna')).toBe(
      '/orgs/firna/workspaces/ws-2/sessions/s%201',
    )
    expect(orgEntry(state, 'other')).toBe('/orgs/other')
    expect(state.latest).toBe('firna')
  })

  test('a reload gets the last workspaces back', () => {
    const storage = new MemoryStorage()
    memory(storage).remember(workspace('acme', 'ws-1'))
    const reloaded = memory(storage)
    expect(orgEntry(reloaded.state.get(), 'acme')).toBe(
      '/orgs/acme/workspaces/ws-1',
    )
    expect(reloaded.state.get().latest).toBe('acme')
  })

  test('a change in one tab keeps the changes of another tab', () => {
    const storage = new MemoryStorage()
    const first = memory(storage)
    const second = memory(storage)
    first.remember(workspace('acme', 'ws-1'))
    second.remember(workspace('firna', 'ws-2'))
    const reloaded = memory(storage).state.get()
    expect([...reloaded.addresses.keys()].sort()).toEqual(['acme', 'firna'])
  })

  test('a forget drops only that workspace of the org', () => {
    const last = memory(new MemoryStorage())
    last.remember(workspace('acme', 'ws-1'))
    last.forget('acme', 'ws-other')
    expect(orgEntry(last.state.get(), 'acme')).toBe(
      '/orgs/acme/workspaces/ws-1',
    )
    last.forget('acme', 'ws-1')
    expect(orgEntry(last.state.get(), 'acme')).toBe('/orgs/acme')
    expect(last.state.get().latest).toBeNull()
  })

  test('each person has their own memory, and a sign-out shows none', () => {
    const storage = new MemoryStorage()
    const last = memory(storage)
    last.remember(workspace('acme', 'ws-1'))
    last.follow('ana')
    expect(last.state.get().addresses.size).toBe(0)
    last.follow(null)
    last.remember(workspace('acme', 'ws-2'))
    last.follow('cal')
    expect(orgEntry(last.state.get(), 'acme')).toBe(
      '/orgs/acme/workspaces/ws-1',
    )
  })

  test('a bad stored value and an address of another org are ignored', () => {
    const storage = new MemoryStorage()
    storage.setItem(key, 'not json')
    expect(memory(storage).state.get().addresses.size).toBe(0)
    storage.setItem(
      key,
      JSON.stringify({
        latest: 'acme',
        orgs: {
          acme: '/orgs/firna/workspaces/ws-1',
          firna: '/orgs/firna/settings',
          beta: 'https://example.com/orgs/beta/workspaces/ws-3',
          ok: '/orgs/ok/workspaces/ws-4',
        },
      }),
    )
    const state = memory(storage).state.get()
    expect([...state.addresses]).toEqual([['ok', '/orgs/ok/workspaces/ws-4']])
    expect(state.latest).toBeNull()
  })

  test('a refused storage keeps the memory while the page stays open', () => {
    const last = memory(refusing)
    expect(() => last.remember(workspace('acme', 'ws-1'))).not.toThrow()
    expect(orgEntry(last.state.get(), 'acme')).toBe(
      '/orgs/acme/workspaces/ws-1',
    )
  })

  test('a full storage keeps each change of the page in memory', () => {
    const storage = new MemoryStorage()
    const full: KeyValueStorage = {
      getItem: (item) => storage.getItem(item),
      setItem: () => {
        throw new Error('The storage is full.')
      },
    }
    const last = memory(full)
    last.remember(workspace('acme', 'ws-1'))
    last.remember(workspace('firna', 'ws-2'))
    expect([...last.state.get().addresses.keys()]).toEqual(['acme', 'firna'])
  })

  test('without a storage, another person gets no memory of the first', () => {
    const last = memory(null)
    last.remember(workspace('acme', 'ws-1'))
    last.follow('ana')
    expect(last.state.get().addresses.size).toBe(0)
  })
})

describe('startPage', () => {
  const acme: OrgSummary = { id: 'acme', name: 'Acme', role: 'admin' }
  const firna: OrgSummary = { id: 'firna', name: 'Firna', role: 'member' }
  const deleted = { deletedAt: 1, deletesAt: 2 }
  const remembered = () => {
    const last = memory(new MemoryStorage())
    last.remember(workspace('firna', 'ws-2'))
    return last.state.get()
  }

  test('opens the workspace that the person opened last', () => {
    expect(startPage(remembered(), [acme, firna], false)).toBe(
      '/orgs/firna/workspaces/ws-2',
    )
  })

  test('opens Get started in the first run and without an open org', () => {
    expect(startPage(remembered(), [acme, firna], true)).toBe('/get-started')
    expect(
      startPage(remembered(), [{ ...acme, deletion: deleted }], false),
    ).toBe('/get-started')
  })

  test('opens the first org when the last org is deleted, gone, or unknown', () => {
    const state = remembered()
    expect(
      startPage(state, [acme, { ...firna, deletion: deleted }], false),
    ).toBe('/orgs/acme')
    expect(startPage(state, [acme], false)).toBe('/orgs/acme')
    expect(startPage(memory(null).state.get(), [acme, firna], false)).toBe(
      '/orgs/acme',
    )
  })
})

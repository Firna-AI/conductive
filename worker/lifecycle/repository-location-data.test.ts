import { afterEach, describe, expect, it, vi } from 'vitest'
import { workspaceRepositoryFolder } from './repository-location-data'

/** A database whose one query gives `row`. */
function databaseWith(row: unknown): D1Database {
  const statement = { bind: () => statement, first: async () => row }
  return { prepare: () => statement } as unknown as D1Database
}

const workspace = { id: 'workspace-1', repositoryId: 'repo-1' }

const stored = {
  repositoryId: 'repo-1',
  orgId: 'org-1',
  fullName: 'acme/checkout',
  defaultBranch: 'main',
  repositoriesJson: null,
  plannedLocationsJson: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('workspaceRepositoryFolder', () => {
  it('gives the stored folder of the workspace repository', async () => {
    const locations = [
      {
        repositoryId: 'repo-1',
        directory: '/home/user/code/checkout',
        variable: 'CONDUCTIVE_REPOSITORY_CHECKOUT_DIR',
      },
    ]
    const db = databaseWith({
      ...stored,
      locationsJson: JSON.stringify(locations),
    })
    expect(await workspaceRepositoryFolder(db, workspace)).toBe(
      '/home/user/code/checkout',
    )
  })

  it('gives null without a warning before the first start', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await workspaceRepositoryFolder(databaseWith(null), workspace)).toBe(
      null,
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns and gives null for unreadable folders', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const db = databaseWith({ ...stored, locationsJson: '{"bad":true}' })
    expect(await workspaceRepositoryFolder(db, workspace)).toBe(null)
    expect(warn).toHaveBeenCalledOnce()
  })
})

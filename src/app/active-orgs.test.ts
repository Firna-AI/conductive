import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../shared/api'
import { leaveOrgPath, type OrgSummary } from '../shared/orgs'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { testServices } from './test-kit'

describe('the active org source of AppModel', () => {
  test('shares stable snapshots and follows deletion, restore, reorder, updates, and leave without losing suspended orgs', async () => {
    const server = new FakeApiServer()
    const [acme, futex, firna] = coreFixtures().orgs.orgs
    const deletion = { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 }
    const suspended = { ...firna, suspension: { suspendedAt: FAKE_TIME } }
    server.json('GET', API_PATHS.orgs, {
      orgs: [acme, { ...futex, deletion }, suspended],
    })
    server.empty('POST', leaveOrgPath('futex'))
    const app = new AppModel(testServices(server))
    const source = app.activeOrgs
    const empty = source.get()
    expect(source.get()).toBe(empty)
    const seen: (readonly OrgSummary[])[] = []
    const stop = source.subscribe(() => seen.push(source.get()))
    await app.start()
    const first = source.get()
    expect(first.map((org) => org.id)).toEqual(['acme', 'firna'])
    expect(app.activeOrgs.get()).toBe(first)
    expect(seen.at(-1)).toBe(first)
    expect(first[1]).toEqual(suspended)
    expect(app.orgs.get().map((org) => org.id)).toEqual([
      'acme',
      'futex',
      'firna',
    ])

    app.putOrg({ ...acme, deletion })
    expect(source.get().map((org) => org.id)).toEqual(['firna'])
    expect(seen.at(-1)).toBe(source.get())
    expect(first.map((org) => org.id)).toEqual(['acme', 'firna'])
    expect(app.orgs.get().find((org) => org.id === 'acme')?.deletion).toEqual(
      deletion,
    )

    app.putOrg(futex)
    expect(source.get().map((org) => org.id)).toEqual(['futex', 'firna'])
    expect(seen.at(-1)).toBe(source.get())

    const move = app.moveOrg('firna', 0)
    expect(source.get().map((org) => org.id)).toEqual(['firna', 'futex'])
    expect(seen.at(-1)).toBe(source.get())
    await move
    expect(app.orgs.get().map((org) => org.id)).toEqual([
      'firna',
      'acme',
      'futex',
    ])

    const renamed = { ...suspended, name: 'Firna team' }
    app.putOrg(renamed)
    expect(source.get()).toEqual([renamed, futex])
    expect(seen.at(-1)).toBe(source.get())
    await app.leaveOrg('futex')
    const left = source.get()
    expect(left).toEqual([renamed])
    expect(seen.at(-1)).toBe(left)
    expect(app.activeOrgs.get()).toBe(left)

    stop()
    const count = seen.length
    app.putOrg(acme)
    expect(source.get()).toEqual([renamed, acme])
    expect(seen).toHaveLength(count)
    expect(source.get()).toBe(app.activeOrgs.get())
  })
})

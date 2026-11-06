import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { createHarness, type TestHarness } from '../test-support/harness'
import { readBrowserAccess } from './browser-access'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import type { BrowserIdentity } from './types'

describe('open workspace tab access', () => {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
  })
  afterAll(async () => {
    await harness.dispose()
  })

  it('rechecks all tabs in one batch within 30 seconds and clears the timer when access ends', async () => {
    const snapshots: BrowserIdentity[][] = []
    let reads = 0
    const database = {
      prepare: (query: string) => {
        reads++
        return harness.env.DB.prepare(query)
      },
    }
    const fixture = await createChatFixture(harness, {
      readBrowserAccess: async (tabs, now) => {
        snapshots.push(structuredClone([...tabs]))
        return readBrowserAccess(database, tabs, now)
      },
    })
    const owner = await fixture.tab()
    const removedA = await fixture.tab(0, undefined, fixture.memberCookie)
    const removedB = await fixture.tab(0, undefined, fixture.memberCookie)
    await harness.env.DB.prepare(
      'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(fixture.org.id, fixture.member.id)
      .run()
    await fixture.clock.advance(29_999)
    expect([owner.closed, removedA.closed, removedB.closed]).toEqual([0, 0, 0])
    expect(snapshots).toEqual([])
    await fixture.clock.advance(1)
    expect([owner.closed, removedA.closed, removedB.closed]).toEqual([0, 1, 1])
    expect(snapshots.map((tabs) => tabs.length)).toEqual([3])
    expect(reads).toBe(1)
    expect(snapshots[0]?.map((tab) => tab.userId)).toEqual([
      fixture.owner.id,
      fixture.member.id,
      fixture.member.id,
    ])
    const removedCount = removedA.messages.length
    await fixture.chat.appendWorkspaceEvent(WORKSPACE_ID, {
      type: 'workspace.title',
      name: 'Only authorized tabs receive this',
    })
    expect(removedA.messages).toHaveLength(removedCount)
    expect(owner.messages.at(-1)).toMatchObject({
      type: 'event',
      envelope: { event: { type: 'workspace.title' } },
    })
    harness.github.profile = {
      id: 7,
      login: 'octocat',
      name: 'Octocat',
      avatar_url: null,
    }
    const freshCookie = await harness.login()
    const fresh = await fixture.tab(0, undefined, freshCookie)
    await harness.request(API_PATHS.signOut, fixture.ownerCookie, {
      method: 'POST',
      body: '{}',
    })
    await fixture.clock.advance(29_999)
    expect([owner.closed, fresh.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([owner.closed, fresh.closed]).toEqual([1, 0])
    expect(snapshots.map((tabs) => tabs.length)).toEqual([3, 2])
    const survivingIdentity = snapshots[1]?.find(
      (tab) => tab.sessionId !== snapshots[0]?.[0]?.sessionId,
    )
    if (!survivingIdentity)
      throw new Error('The newly authenticated session was not checked.')
    const anotherCookie = await harness.login()
    const another = await fixture.tab(0, undefined, anotherCookie)
    await harness.env.DB.prepare(
      'UPDATE sessions SET expires_at = ? WHERE id = ?',
    )
      .bind(fixture.clock.now() + 30_000, survivingIdentity.sessionId)
      .run()
    await fixture.clock.advance(29_999)
    expect([fresh.closed, another.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([fresh.closed, another.closed]).toEqual([1, 0])
    const sameSessionTab = await fixture.tab(0, undefined, anotherCookie)
    await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
      .bind(fixture.clock.now(), fixture.org.id)
      .run()
    await fixture.clock.advance(29_999)
    expect([another.closed, sameSessionTab.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([another.closed, sameSessionTab.closed]).toEqual([1, 1])
    expect(snapshots.map((tabs) => tabs.length)).toEqual([3, 2, 2, 2])
    expect(reads).toBe(4)
    expect(fixture.clock.scheduledCount).toBe(0)
    const afterClosure = another.messages.length
    await fixture.chat.appendWorkspaceEvent(WORKSPACE_ID, {
      type: 'workspace.title',
      name: 'No tabs remain',
    })
    expect(another.messages).toHaveLength(afterClosure)
    await fixture.clock.advance(90_000)
    expect(snapshots).toHaveLength(4)
    owner.close()
    removedA.close()
    removedB.close()
    fresh.close()
    another.close()
    sameSessionTab.close()
  })

  it('keeps the next batch deadline when a tab opens during an access read', async () => {
    const entered = signal()
    const release = signal()
    let reads = 0
    const fixture = await createChatFixture(harness, {
      readBrowserAccess: async (tabs, now) => {
        const allowed = await readBrowserAccess(harness.env.DB, tabs, now)
        if (++reads === 1) {
          entered.resolve()
          await release.promise
        }
        return allowed
      },
    })
    const first = await fixture.tab()
    const boundary = fixture.clock.advance(30_000)
    await entered.promise
    await fixture.clock.advance(10_000)
    const second = await fixture.tab()
    release.resolve()
    await boundary
    await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
      .bind(fixture.clock.now(), fixture.org.id)
      .run()
    await fixture.clock.advance(19_999)
    expect(reads).toBe(1)
    expect([first.closed, second.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([first.closed, second.closed]).toEqual([1, 1])
    expect(reads).toBe(2)
    expect(fixture.clock.scheduledCount).toBe(0)
    first.close()
    second.close()
  })
})

function signal() {
  let resolve: () => void = () => {
    throw new Error('The signal is not ready.')
  }
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { resolve, promise }
}

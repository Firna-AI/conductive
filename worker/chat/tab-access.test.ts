import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { API_PATHS } from '../../src/shared/api'
import {
  readConnectionAccess,
  type ConnectionIdentity,
} from '../security/connection-access'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
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
    const snapshots: ConnectionIdentity[][] = []
    let reads = 0
    const database = {
      prepare: (query: string) => {
        reads++
        return harness.env.DB.prepare(query)
      },
    }
    const fixture = await createChatFixture(harness, {
      readConnectionAccess: async (tabs, now) => {
        snapshots.push(structuredClone([...tabs]))
        return readConnectionAccess(database, tabs, now)
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
    await fixture.clock.advance(14999)
    expect([owner.closed, removedA.closed, removedB.closed]).toEqual([0, 0, 0])
    expect(snapshots.map((tabs) => tabs.length)).toEqual([1, 1, 1])
    await fixture.clock.advance(1)
    expect([owner.closed, removedA.closed, removedB.closed]).toEqual([0, 1, 1])
    expect(snapshots.map((tabs) => tabs.length)).toEqual([1, 1, 1, 3])
    expect(reads).toBe(4)
    expect(snapshots[3]?.map((tab) => tab.userId)).toEqual([
      fixture.owner.id,
      fixture.member.id,
      fixture.member.id,
    ])
    const removedCount = removedA.messages.length
    await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
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
    await fixture.clock.advance(14999)
    expect([owner.closed, fresh.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([owner.closed, fresh.closed]).toEqual([1, 0])
    expect(snapshots.map((tabs) => tabs.length)).toEqual([1, 1, 1, 3, 1, 2])
    const survivingIdentity = snapshots[5]?.find(
      (tab) => tab.sessionId !== snapshots[3]?.[0]?.sessionId,
    )
    if (!survivingIdentity)
      throw new Error('The newly authenticated session was not checked.')
    const anotherCookie = await harness.login()
    const another = await fixture.tab(0, undefined, anotherCookie)
    await harness.env.DB.prepare(
      'UPDATE sessions SET expires_at = ? WHERE id = ?',
    )
      .bind(fixture.clock.now() + 15000, survivingIdentity.sessionId)
      .run()
    await fixture.clock.advance(14999)
    expect([fresh.closed, another.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([fresh.closed, another.closed]).toEqual([1, 0])
    const sameSessionTab = await fixture.tab(0, undefined, anotherCookie)
    await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
      .bind(fixture.clock.now(), fixture.org.id)
      .run()
    await fixture.clock.advance(14999)
    expect([another.closed, sameSessionTab.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([another.closed, sameSessionTab.closed]).toEqual([1, 1])
    expect(snapshots.map((tabs) => tabs.length)).toEqual([
      1, 1, 1, 3, 1, 2, 1, 2, 1, 2,
    ])
    expect(reads).toBe(10)
    expect(await fixture.clock.scheduledCount()).toBe(0)
    const afterClosure = another.messages.length
    await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
      type: 'workspace.title',
      name: 'No tabs remain',
    })
    expect(another.messages).toHaveLength(afterClosure)
    await fixture.clock.advance(90000)
    expect(snapshots).toHaveLength(10)
    await owner.close()
    await removedA.close()
    await removedB.close()
    await fresh.close()
    await another.close()
    await sameSessionTab.close()
  })
  it('keeps the next batch deadline when a tab opens during an access read', async () => {
    const entered = signal()
    const release = signal()
    let reads = 0
    let holdNextRead = false
    const fixture = await createChatFixture(harness, {
      readConnectionAccess: async (tabs, now) => {
        const allowed = await readConnectionAccess(harness.env.DB, tabs, now)
        reads++
        if (holdNextRead) {
          holdNextRead = false
          entered.resolve()
          await release.promise
        }
        return allowed
      },
    })
    const first = await fixture.tab()
    holdNextRead = true
    const boundary = fixture.clock.advance(15000)
    await entered.promise
    await fixture.clock.advance(10000)
    const second = await fixture.tab()
    release.resolve()
    await boundary
    await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
      .bind(fixture.clock.now(), fixture.org.id)
      .run()
    await fixture.clock.advance(4999)
    expect(reads).toBe(3)
    expect([first.closed, second.closed]).toEqual([0, 0])
    await fixture.clock.advance(1)
    expect([first.closed, second.closed]).toEqual([1, 1])
    expect(reads).toBe(4)
    expect(await fixture.clock.scheduledCount()).toBe(0)
    await first.close()
    await second.close()
  })
  it('keeps active member history readable after the workspace owner is suspended', async () => {
    const fixture = await createChatFixture(harness)
    const member = await fixture.tab(0, undefined, fixture.memberCookie)
    await harness.env.DB.prepare(
      'UPDATE users SET suspended_at = ? WHERE id = ?',
    )
      .bind(fixture.clock.now(), fixture.owner.id)
      .run()
    await fixture.clock.advance(15000)
    expect(member.closed).toBe(0)
    await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
      type: 'workspace.title',
      name: 'History stays available',
    })
    expect(member.messages.at(-1)).toMatchObject({
      type: 'event',
      envelope: {
        event: { type: 'workspace.title', name: 'History stays available' },
      },
    })
    const reopened = await fixture.tab(0, undefined, fixture.memberCookie)
    expect(reopened.closed).toBe(0)
    await member.close()
    await reopened.close()
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

import { expect } from 'vitest'

import type { backendFixture } from './backend-test-support'
import type { BackendActor } from './backend-test-platform'
import { boatRoute } from '../sandbox/routes'
import { controlRoute } from '../sandbox/e2b/routes'
import { seedWorkspace } from '../members/members-test-support'

export type RetryFixture = Awaited<ReturnType<typeof backendFixture>>

export interface RetryProbe {
  now(): number
  setTime(at: number): Promise<void>
  run(): Promise<void>
  recover(): Promise<void>
  alarm(): Promise<number | undefined>
  calls(): number
}

export function nativeRetryProbe(
  fixture: RetryFixture,
  actor: BackendActor,
  id: string,
  source: string,
  calls: () => number,
): RetryProbe {
  return {
    now: fixture.runtime.dependencies.now,
    setTime: fixture.setTime,
    run: async () => {
      await actor.storage.setAlarm(fixture.runtime.dependencies.now())
      await fixture.advanceTo(fixture.runtime.dependencies.now(), id)
    },
    recover: async () => {
      await actor.storage.put(
        'alarm:lifecycle:run',
        fixture.runtime.dependencies.now(),
      )
      await actor.restart()
    },
    alarm: () => actor.storage.get<number>(`alarm:${source}`),
    calls,
  }
}

/** Literal waits and a day of action counts protect the cap and unlimited retries. */
export async function assertRetryDay(probe: RetryProbe): Promise<void> {
  const waits = [
    30_000, 60_000, 120_000, 240_000, 480_000, 960_000, 1_920_000, 3_600_000,
    3_600_000,
  ]
  const start = probe.now()
  const before = probe.calls()
  let at = start
  for (let attempt = 0; attempt < 30; attempt++) {
    await probe.setTime(at)
    await probe.run()
    expect(probe.calls(), `action ${attempt + 1}`).toBe(before + attempt + 1)
    at += waits[attempt] ?? 3_600_000
    expect(await probe.alarm(), `wait after action ${attempt + 1}`).toBe(at)
    if (attempt === 1) {
      await probe.setTime(at - 1)
      await probe.run()
      expect(probe.calls(), 'early alarm').toBe(before + 2)
      expect(await probe.alarm()).toBe(at)
      await probe.recover()
      await probe.run()
      expect(probe.calls(), 'recovered alarm').toBe(before + 2)
      expect(await probe.alarm()).toBe(at)
    }
  }
  expect(at).toBe(start + 86_610_000)
  await probe.setTime(start + 86_400_000)
  await probe.run()
  expect(probe.calls(), 'action attempts in 24 hours').toBe(before + 30)
  expect(await probe.alarm()).toBe(start + 86_610_000)
}

export function refuseAction(
  fixture: RetryFixture,
  operation: 'stop' | 'resume' | 'delete' | 'get',
  sandboxId: string,
  provider: 'boat' | 'e2b' = 'boat',
) {
  const route =
    provider === 'boat'
      ? boatRoute({ operation, sandboxId })
      : controlRoute({
          operation:
            operation === 'stop'
              ? 'pause'
              : operation === 'resume'
                ? 'connect'
                : operation,
          sandboxId,
        })
  const get =
    provider === 'boat'
      ? boatRoute({ operation: 'get', sandboxId })
      : controlRoute({ operation: 'get', sandboxId })
  const fetch = fixture.runtime.dependencies.fetch
  let calls = 0
  let reads = 0
  let failing = true
  let retryAfter: string | undefined
  let observe: (() => Promise<void>) | undefined
  fixture.runtime.dependencies.fetch = async (request) => {
    const path = new URL(request.url).pathname
    if (request.method === get.method && path.endsWith(get.path)) reads++
    if (request.method === route.method && path.endsWith(route.path)) {
      calls++
      await observe?.()
      if (failing)
        return Response.json(
          { ok: false, code: 'unavailable' },
          {
            status: 503,
            headers:
              retryAfter === undefined ? {} : { 'Retry-After': retryAfter },
          },
        )
    }
    return fetch(request)
  }
  return {
    calls: () => calls,
    reads: () => reads,
    observe: (callback: () => Promise<void>) => {
      observe = callback
    },
    fail: (seconds?: string) => {
      failing = true
      retryAfter = seconds
    },
    succeed: () => {
      failing = false
    },
  }
}

export function retryActor(fixture: RetryFixture, id: string): BackendActor {
  fixture.runtime.workspace(id)
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('Missing retry actor')
  return actor
}

export async function seedRetryWorkspace(
  fixture: RetryFixture,
  id: string,
  sandboxId: string,
): Promise<void> {
  await seedWorkspace(
    fixture.harness,
    fixture.org,
    fixture.user,
    id,
    fixture.repositoryId,
    sandboxId,
  )
  await fixture.runtime.env.DB.prepare(
    `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id,
     session_id, first_turn_id, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, ?, ?, 'codex', 'gpt-5.5', 'high', ?)`,
  )
    .bind(
      id,
      fixture.org.id,
      fixture.user.id,
      `${id}-session`,
      `${id}-turn`,
      id,
    )
    .run()
}

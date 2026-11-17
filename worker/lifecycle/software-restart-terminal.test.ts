import { afterEach, expect, it, vi } from 'vitest'

import { terminalPaths } from '../../src/shared/terminal'
import { workspaceTarget } from '../previews/access'
import {
  cacheTerminalPassword,
  terminalPassword,
  terminalSeveral,
} from '../terminal/credentials'
import { TERMINALS_KEY } from '../terminal/list-store'
import {
  TERMINAL_RUNTIME_VIEW,
  TERMINAL_SUPPORT_FILE,
} from '../terminal/scripts'
import { setupBackendTests } from './backend-test-hooks'
import { RESTART_COMMAND } from './software-restart'
import { readyWorkspace } from './software-restart.test-support'

const fixtureForTest = setupBackendTests()
const markerPath = `${TERMINAL_RUNTIME_VIEW}/${TERMINAL_SUPPORT_FILE}`
afterEach(() => vi.restoreAllMocks())

function terminalReads(
  fixture: ReturnType<typeof fixtureForTest>,
  marker: string,
  fail?: 'password' | 'marker',
) {
  const reads: string[] = []
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    const url = new URL(request.url)
    const path = url.searchParams.get('path')
    if (url.pathname.endsWith('/files') && path) {
      reads.push(path)
      if (
        (fail === 'marker' && path === markerPath) ||
        (fail === 'password' && path.endsWith('/password'))
      )
        return Response.json(
          { ok: false, code: 'unavailable' },
          { status: 503 },
        )
      if (path === markerPath)
        return Response.json({
          ok: true,
          type: 'file.read',
          success: true,
          path,
          size: marker.length,
          encoding: 'base64',
          content: btoa(marker),
        })
    }
    return fetch(request)
  }
  return reads
}

it('refreshes support and the password after an early runner ready, and commits exactly one ordered full-list event', async () => {
  const { fixture, actor, workspaceId, restart, lifecycle } =
    await readyWorkspace(fixtureForTest())
  const { env } = fixture.runtime
  const secondId = '0123456789abcdef0123456789abcdef'
  await actor.native.api.storage.put(TERMINALS_KEY, [
    { id: 'workspace', number: 1 },
    { id: secondId, number: 2 },
  ])
  const terminals = [
    {
      id: 'workspace',
      number: 1,
      socketPath: terminalPaths.terminalSocket(
        fixture.org.id,
        workspaceId,
        'workspace',
      ),
    },
    {
      id: secondId,
      number: 2,
      socketPath: terminalPaths.terminalSocket(
        fixture.org.id,
        workspaceId,
        secondId,
      ),
    },
  ]
  const before = await actor.native.api.controls.eventNumber(workspaceId)
  const reads = terminalReads(fixture, '1\n')
  fixture.boat.terminalPassword = 'c'.repeat(64)
  fixture.boat.beforeCommand = async (command) => {
    if (command === RESTART_COMMAND)
      await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  }
  expect(await restart()).toEqual({ updateCheck: 'ok' })
  expect((await lifecycle())?.state).toBe('ready')
  expect(reads).toEqual([`${TERMINAL_RUNTIME_VIEW}/password`, markerPath])
  expect(await terminalPassword(env, workspaceId, 'bx_1', 'boat')).toBe(
    'c'.repeat(64),
  )
  expect(await terminalSeveral(env, workspaceId, 'bx_1', 'boat')).toBe(true)
  const history = await actor.native.api.controls.history(workspaceId, before)
  const updates = history.events.filter(
    ({ event }) => event.type === 'terminals.updated',
  )
  expect(updates).toEqual([
    expect.objectContaining({
      event: { type: 'terminals.updated', terminals, several: true },
    }),
  ])
  expect(updates[0]?.eventNumber).toBe(history.throughEventNumber)
  expect(updates[0]?.eventNumber).toBeGreaterThan(before)
  expect(
    (await actor.native.api.controls.rawRecords()).get(TERMINALS_KEY),
  ).toEqual([
    { id: 'workspace', number: 1 },
    { id: secondId, number: 2 },
  ])
})

it('refreshes the password without a terminal event when support stays the same', async () => {
  const { fixture, actor, workspaceId, restart } =
    await readyWorkspace(fixtureForTest())
  const before = await actor.native.api.controls.eventNumber(workspaceId)
  terminalReads(fixture, '0\n')
  fixture.boat.terminalPassword = 'c'.repeat(64)
  expect(await restart()).toEqual({ updateCheck: 'ok' })
  expect(
    await terminalPassword(fixture.runtime.env, workspaceId, 'bx_1', 'boat'),
  ).toBe('c'.repeat(64))
  expect(
    await terminalSeveral(fixture.runtime.env, workspaceId, 'bx_1', 'boat'),
  ).toBe(false)
  expect(
    (
      await actor.native.api.controls.history(workspaceId, before)
    ).events.filter(({ event }) => event.type === 'terminals.updated'),
  ).toEqual([])
})

it('caches one-terminal support after an older release writes zero, and publishes the change', async () => {
  const { fixture, actor, workspaceId, restart } =
    await readyWorkspace(fixtureForTest())
  const { env } = fixture.runtime
  await cacheTerminalPassword(
    env,
    await workspaceTarget(env, fixture.org.id, workspaceId),
    fixture.boat.terminalPassword,
    fixture.runtime.dependencies.now(),
    true,
  )
  terminalReads(fixture, '0\n')
  const before = await actor.native.api.controls.eventNumber(workspaceId)
  expect(await restart()).toEqual({ updateCheck: 'ok' })
  expect(await terminalSeveral(env, workspaceId, 'bx_1', 'boat')).toBe(false)
  expect(
    (await actor.native.api.controls.history(workspaceId, before)).events
      .filter(({ event }) => event.type === 'terminals.updated')
      .map(({ event }) => event),
  ).toEqual([
    {
      type: 'terminals.updated',
      several: false,
      terminals: [
        {
          id: 'workspace',
          number: 1,
          socketPath: terminalPaths.terminalSocket(
            fixture.org.id,
            workspaceId,
            'workspace',
          ),
        },
      ],
    },
  ])
})

it.each(['password', 'marker'] as const)(
  'keeps cached credentials and support and warns when the %s read fails, without failing Restart',
  async (fail) => {
    const { fixture, actor, workspaceId, restart } =
      await readyWorkspace(fixtureForTest())
    const { env } = fixture.runtime
    await cacheTerminalPassword(
      env,
      await workspaceTarget(env, fixture.org.id, workspaceId),
      fixture.boat.terminalPassword,
      fixture.runtime.dependencies.now(),
      true,
    )
    terminalReads(fixture, '0\n', fail)
    fixture.boat.terminalPassword = 'c'.repeat(64)
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const before = await actor.native.api.controls.eventNumber(workspaceId)
    expect(await restart()).toEqual({ updateCheck: 'ok' })
    expect(await terminalSeveral(env, workspaceId, 'bx_1', 'boat')).toBe(true)
    expect(await terminalPassword(env, workspaceId, 'bx_1', 'boat')).toBe(
      'b'.repeat(64),
    )
    expect(warnings.mock.calls).toEqual([
      [
        {
          kind: 'terminal_restart_refresh_failed',
          message:
            'The terminal credentials and support could not be refreshed after Restart.',
        },
      ],
    ])
    expect(
      (
        await actor.native.api.controls.history(workspaceId, before)
      ).events.filter(({ event }) => event.type === 'terminals.updated'),
    ).toEqual([])
  },
)

it.each(["sandbox_id = 'bx_replacement'", "provider_account = 'boat-second'"])(
  'does not refresh a replacement sandbox or provider account after Restart: %s',
  async (change) => {
    const { fixture, actor, workspaceId, restart } =
      await readyWorkspace(fixtureForTest())
    const reads = terminalReads(fixture, '1\n')
    const before = await actor.native.api.controls.eventNumber(workspaceId)
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fixture.boat.beforeCommand = async (command) => {
      if (command === RESTART_COMMAND)
        await fixture.runtime.env.DB.prepare(
          `UPDATE workspaces SET ${change} WHERE id = ?`,
        )
          .bind(workspaceId)
          .run()
    }
    expect(await restart()).toEqual({ updateCheck: 'ok' })
    expect(reads).toEqual([])
    expect(
      await terminalSeveral(fixture.runtime.env, workspaceId, 'bx_1', 'boat'),
    ).toBe(false)
    expect(
      await terminalPassword(fixture.runtime.env, workspaceId, 'bx_1', 'boat'),
    ).toBe('b'.repeat(64))
    expect(warnings.mock.calls).toEqual([
      [
        {
          kind: 'terminal_restart_refresh_failed',
          message:
            'The terminal credentials and support could not be refreshed after Restart.',
        },
      ],
    ])
    expect(
      (
        await actor.native.api.controls.history(workspaceId, before)
      ).events.filter(({ event }) => event.type === 'terminals.updated'),
    ).toEqual([])
  },
)

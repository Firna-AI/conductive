import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import { decrypt } from '../security/crypto'
import { terminalPassword, terminalSeveral } from './credentials'
import { shellArgument } from './privileged'
import { TERMINAL_RUNTIME_VIEW, TERMINAL_SUPPORT_FILE } from './scripts'
import { startWorkspaceTerminal, terminalStartCommand } from './service'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

it('caches only the trusted current sandbox password without exposing it in startup commands', async () => {
  const seed = await harness.seed()
  const password = 'b'.repeat(64)
  const readiness = terminalStartCommand()
  expect(readiness.startsWith("sudo -n -- /bin/sh -c '")).toBe(true)
  expect(readiness).not.toContain(password)
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/files')) {
      return Response.json({
        ok: true,
        type: 'file.read',
        success: true,
        path: new URL(request.url).searchParams.get('path'),
        size: 64,
        encoding: 'base64',
        content: btoa(password),
      })
    }
    return base(request)
  }
  await startWorkspaceTerminal(
    harness.env,
    seed.orgId,
    seed.workspaceId,
    harness.dependencies,
  )
  expect(readiness).not.toContain('cat /run/conductive-terminal/password')
  expect(readiness).toContain(
    shellArgument(
      `mount --bind ${shellArgument('/run/conductive-terminal')} ${shellArgument(TERMINAL_RUNTIME_VIEW)}`,
    ).slice(1, -1),
  )
  const stored = await harness.env.DB.prepare(
    'SELECT ciphertext FROM terminal_credentials WHERE workspace_id = ?',
  )
    .bind(seed.workspaceId)
    .first<{ ciphertext: string }>()
  expect(
    await decrypt(
      stored?.ciphertext ?? '',
      JSON.stringify(['terminal-password', seed.workspaceId]),
      harness.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  ).toBe(password)
})

it('caches support only for an exact bounded marker and the current sandbox identity', async () => {
  const seed = await harness.seed()
  const base = harness.dependencies.fetch
  let marker: {
    content: string
    encoding: 'base64' | 'utf8'
    size: number
    status?: number
  }
  harness.dependencies.fetch = async (request) => {
    const url = new URL(request.url)
    if (
      url.searchParams.get('path') ===
      `${TERMINAL_RUNTIME_VIEW}/${TERMINAL_SUPPORT_FILE}`
    ) {
      if (marker.status || url.pathname.endsWith('/info'))
        return Response.json(
          { ok: false, code: 'not_found' },
          { status: marker.status ?? 404 },
        )
      return Response.json({
        ok: true,
        type: 'file.read',
        success: true,
        path: url.searchParams.get('path'),
        ...marker,
      })
    }
    return base(request)
  }
  for (const [file, several] of [
    [{ content: btoa('1\n'), encoding: 'base64', size: 2 }, true],
    [{ content: '1\n', encoding: 'utf8', size: 2 }, true],
    [{ content: '', encoding: 'base64', size: 0, status: 404 }, false],
    [{ content: '', encoding: 'base64', size: 0, status: 503 }, false],
    [{ content: btoa('0\n'), encoding: 'base64', size: 2 }, false],
    [{ content: btoa('yes'), encoding: 'base64', size: 3 }, false],
    [{ content: btoa('1\n'), encoding: 'base64', size: 1 }, false],
    [{ content: '!!', encoding: 'base64', size: 2 }, false],
  ] as const) {
    marker = file
    await startWorkspaceTerminal(
      harness.env,
      seed.orgId,
      seed.workspaceId,
      harness.dependencies,
    )
    expect(
      await terminalSeveral(harness.env, seed.workspaceId, 'bx_one', 'boat'),
      JSON.stringify(file),
    ).toBe(several)
    expect(
      await terminalPassword(harness.env, seed.workspaceId, 'bx_one', 'boat'),
    ).toBe('a'.repeat(64))
    expect(
      await terminalSeveral(harness.env, seed.workspaceId, 'bx_other', 'boat'),
    ).toBe(false)
    expect(
      await terminalSeveral(
        harness.env,
        seed.workspaceId,
        'bx_one',
        'boat-other',
      ),
    ).toBe(false)
    expect(
      await terminalSeveral(harness.env, seed.workspaceId, null, 'boat'),
    ).toBe(false)
    expect(
      await terminalSeveral(harness.env, 'unknown', 'bx_one', 'boat'),
    ).toBe(false)
  }
})

it('refuses to cache a terminal password when the sandbox changes during its password read', async () => {
  const seed = await harness.seed()
  const base = harness.dependencies.fetch
  let change = "sandbox_id = 'bx_replacement'"
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/files')) {
      await harness.env.DB.prepare(
        `UPDATE workspaces SET ${change} WHERE id = ?`,
      )
        .bind(seed.workspaceId)
        .run()
    }
    return base(request)
  }
  for (change of [
    "sandbox_id = 'bx_replacement'",
    "provider_account = 'boat-second'",
  ]) {
    await harness.env.DB.prepare(
      "UPDATE workspaces SET sandbox_id = 'bx_one', provider_account = 'boat' WHERE id = ?",
    )
      .bind(seed.workspaceId)
      .run()
    await expect(
      startWorkspaceTerminal(
        harness.env,
        seed.orgId,
        seed.workspaceId,
        harness.dependencies,
      ),
    ).rejects.toMatchObject({ status: 404 })
    expect(
      await harness.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM terminal_credentials',
      ).first<number>('count'),
    ).toBe(0)
  }
})

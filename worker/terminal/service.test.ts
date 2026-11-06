import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import { decrypt } from '../security/crypto'
import { startWorkspaceTerminal, installTerminalService } from './service'

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

it('keeps the local password through automatic service restarts and caches only the trusted current sandbox response', async () => {
  const seed = await harness.seed()
  let installed = ''
  await installTerminalService(
    {
      runCommand: async (_id, command) => {
        installed = command
        return { exitCode: 0, stdout: '', stderr: '', timedOut: false }
      },
    },
    'image',
  )
  expect(installed).toContain('RuntimeDirectoryPreserve=yes')
  expect(installed).toContain('if ! grep -Eq')
  const password = 'b'.repeat(64)
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/commands')) {
      const body: { command: string } = await request.json()
      expect(body.command.startsWith("sudo -n -- /bin/sh -c '")).toBe(true)
      expect(body.command).not.toContain(password)
      expect(body.command).not.toContain('printf')
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 0,
        stdout: password + '\n',
        stderr: '',
        timedOut: false,
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

it('refuses to cache a terminal password when the sandbox changes during its readiness command', async () => {
  const seed = await harness.seed()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/commands')) {
      await harness.env.DB.prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_replacement' WHERE id = ?",
      )
        .bind(seed.workspaceId)
        .run()
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 0,
        stdout: 'c'.repeat(64) + '\n',
        stderr: '',
        timedOut: false,
      })
    }
    return base(request)
  }
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
})

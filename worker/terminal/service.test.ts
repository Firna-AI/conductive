import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

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
afterEach(() => {
  vi.restoreAllMocks()
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
  expect(installed).toContain('if ! valid_password')
  const password = 'b'.repeat(64)
  let readiness = ''
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/commands')) {
      const body: { command: string } = await request.json()
      readiness = body.command
      expect(body.command.startsWith("sudo -n -- /bin/sh -c '")).toBe(true)
      expect(body.command).not.toContain(password)
      expect(body.command).not.toContain('printf')
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
      })
    }
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
    'mount --bind /run/conductive-terminal /home/user/.conductive-terminal',
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
        stdout: '',
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

// The command output comes from the sandbox, so it can hold a secret.
it('names only the exit code and the time-out when the terminal does not start', async () => {
  const seed = await harness.seed()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/commands'))
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 1,
        stdout: '',
        stderr: 'password=private-marker',
        timedOut: false,
      })
    return base(request)
  }
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  await expect(
    startWorkspaceTerminal(
      harness.env,
      seed.orgId,
      seed.workspaceId,
      harness.dependencies,
    ),
  ).rejects.toMatchObject({ kind: 'unavailable', status: 502 })
  expect(warn.mock.calls).toEqual([
    [
      `The terminal of workspace ${seed.workspaceId} did not start: exit code 1, timed out false`,
    ],
  ])
})

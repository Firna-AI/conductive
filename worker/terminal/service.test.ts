import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { backendPlatform } from '../lifecycle/backend-test-platform'
import { readSavedScript } from '../lifecycle/saved-script'
import { advanceStartCommand } from '../lifecycle/start-command-execution'
import { durableStartStorage } from '../lifecycle/start-storage'
import type { WorkspaceStartJob } from '../lifecycle/start-types'
import { readWorkspace } from '../lifecycle/workspace-data'
import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import { sandboxProvider } from '../sandbox/client'
import { decrypt } from '../security/crypto'
import {
  startWorkspaceTerminal,
  installTerminalService,
  terminalStartCommand,
} from './service'

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
  expect(installed).toContain('if ! valid_password')
  const password = 'b'.repeat(64)
  const readiness = terminalStartCommand()
  expect(readiness.startsWith("sudo -n -- /bin/sh -c '")).toBe(true)
  expect(readiness).not.toContain(password)
  expect(readiness).not.toContain('printf')
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

it('refuses to cache a terminal password when the sandbox changes during its password read', async () => {
  const seed = await harness.seed()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/files')) {
      await harness.env.DB.prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_replacement' WHERE id = ?",
      )
        .bind(seed.workspaceId)
        .run()
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

it('logs terminal setup failure metadata without command stdout or stderr', async () => {
  const seed = await harness.seed()
  await harness.env.DB.prepare(
    `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id,
      session_id, first_turn_id, agent, model, effort, first_message_id)
     SELECT id, org_id, owner_user_id, 'terminal-session', 'terminal-turn',
       'claude', 'model', 'high', 'terminal-message' FROM workspaces WHERE id = ?`,
  )
    .bind(seed.workspaceId)
    .run()
  const platform = backendPlatform(
    harness.env,
    { ...harness.dependencies, randomToken: () => 'unused' },
    () => undefined,
  )
  const storage = durableStartStorage(
    platform.storage,
    harness.dependencies.now,
    harness.env,
  )
  const job: WorkspaceStartJob = {
    orgId: seed.orgId,
    workspaceId: seed.workspaceId,
    kind: 'resume',
    imageName: null,
    startupScript: readSavedScript(''),
    environmentCiphertext: null,
    defaultBranch: 'main',
    turnId: 'terminal-turn',
    attempt: 'terminal-attempt',
    phase: 'terminal',
    processId: 1,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
  await storage.begin(job, 0)
  const requests: string[] = []
  const provider = sandboxProvider(harness.env, async (request) => {
    requests.push(new URL(request.url).pathname)
    if (new URL(request.url).pathname.endsWith('/commands/1'))
      return Response.json({
        ok: true,
        success: true,
        type: 'command.status',
        processId: 1,
        status: 'exited',
        running: false,
        exitCode: 1,
        timedOut: false,
        stdout: 'password=private-stdout-marker',
        stderr: 'token=private-stderr-marker',
        stdoutOffset: 0,
        stderrOffset: 0,
        stdoutNextOffset: 30,
        stderrNextOffset: 27,
        more: false,
      })
    return harness.boat.fetch(request)
  })
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    await expect(
      advanceStartCommand(
        harness.env,
        platform.endpoint(),
        storage,
        provider,
        await readWorkspace(harness.env.DB, seed.orgId, seed.workspaceId),
        job,
        'Terminal',
      ),
    ).rejects.toMatchObject({ code: 'workspace_start_failed' })
    const logged = JSON.stringify(warn.mock.calls)
    expect(logged).not.toContain('private-stdout-marker')
    expect(logged).not.toContain('private-stderr-marker')
    expect(warn.mock.calls).toEqual([
      [
        {
          kind: 'terminal_start_failed',
          message: 'The terminal of a workspace did not start.',
          workspaceId: 'unknown',
          exitCode: 1,
          timedOut: false,
        },
      ],
    ])
    expect(requests.some((path) => path.endsWith('/files'))).toBe(false)
  } finally {
    warn.mockRestore()
  }
})

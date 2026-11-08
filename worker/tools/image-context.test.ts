import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { DEVICE_COMMAND_PATH } from '../../src/shared/device'
import { imageTestProcess } from './image-test-process'
import { installedToolContext } from './image-context.test-support'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpToolCall,
  mcpRepliesById,
} from './mcp-test-support'

it('keeps active CLI and MCP context across a stale secrets file and uses saved context only when runtime values are absent', async () => {
  const fixture = await installedToolContext()
  const create = [
    'workspaces',
    'create',
    '--repository',
    'repo',
    '--message',
    'Keep active context',
  ]
  const mac = [
    'mac',
    'run',
    '--command',
    'printf done',
    '--folder',
    '/tmp',
    '--reason',
    'Check context',
  ]
  try {
    const cli = await imageTestProcess(
      fixture.executable,
      create,
      '',
      fixture.runtime,
    )
    expect(cli.exitCode, cli.stderr).toBe(0)
    const macCli = await imageTestProcess(
      fixture.executable,
      mac,
      '',
      fixture.runtime,
    )
    expect(macCli.exitCode, macCli.stderr).toBe(0)
    const mcp = await imageTestProcess(
      fixture.executable,
      ['mcp'],
      [
        MCP_INITIALIZE,
        MCP_INITIALIZED,
        mcpToolCall('create', 'create_workspace', {
          repositoryId: 'repo',
          firstMessage: 'Keep active context',
        }),
        mcpToolCall('mac', 'run_mac_command', {
          command: 'printf done',
          folder: '/tmp',
          reason: 'Check context',
        }),
        '',
      ].join('\n'),
      fixture.runtime,
    )
    expect(mcp.exitCode, mcp.stderr).toBe(0)
    expect(mcpRepliesById(mcp.stdout.trim().split('\n'))).toMatchObject({
      create: { result: { isError: false } },
      mac: { result: { isError: false } },
    })
    expect(fixture.requests).toHaveLength(4)
    expect(fixture.requests.map((request) => request.path).sort()).toEqual([
      DEVICE_COMMAND_PATH,
      DEVICE_COMMAND_PATH,
      MACHINE_PATHS.workspaces,
      MACHINE_PATHS.workspaces,
    ])
    expect(
      fixture.requests.map(({ authorization, turn }) => ({
        authorization,
        turn,
      })),
    ).toEqual(
      Array.from({ length: 4 }, () => ({
        authorization: 'Bearer active-scoped-token',
        turn: 'original-runtime-turn',
      })),
    )
    await fixture.fallback()
    const fallback = await imageTestProcess(fixture.executable, create)
    expect(fallback.exitCode, fallback.stderr).toBe(0)
    expect(fixture.requests.at(-1)).toEqual({
      path: MACHINE_PATHS.workspaces,
      authorization: 'Bearer saved-fallback-token',
      turn: 'saved-fallback-turn',
    })
  } finally {
    await fixture.dispose()
  }
})

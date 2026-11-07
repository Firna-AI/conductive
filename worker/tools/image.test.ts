import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { expect, it } from 'vitest'

import { TOOL_ENV } from '../../tools/context'
import { MCP_PROTOCOL_VERSION } from '../../tools/mcp'
import {
  installWorkspaceTools,
  WORKSPACE_TOOLS_COMMAND,
  WORKSPACE_TOOLS_SECRETS_FILE,
} from './image'
import { WORKSPACE_TOOL_SOURCES } from './image-assets'
import { imageTestProcess } from './image-test-process'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpRepliesById,
  mcpRequest,
} from './mcp-test-support'

it('reports failed or incomplete image installation instead of accepting it', async () => {
  const sources = WORKSPACE_TOOL_SOURCES
  for (const result of [
    {
      exitCode: 1,
      stdout: '',
      stderr: 'private install details',
      timedOut: false,
    },
    { exitCode: null, stdout: '', stderr: '', timedOut: true },
  ]) {
    await expect(
      installWorkspaceTools(sources, async () => result),
    ).rejects.toThrow('The workspace tools could not be installed.')
  }
})

it('installs working CLI and MCP tools under a root with spaces and apostrophes', async () => {
  const root = await mkdtemp(join(tmpdir(), "conducting image's "))
  try {
    await installWorkspaceTools(
      WORKSPACE_TOOL_SOURCES,
      async (command) => {
        const result = await imageTestProcess('/bin/sh', ['-c', command])
        expect(result.exitCode, result.stderr).toBe(0)
        return result
      },
      root,
    )
    const systemNode = join(root, 'usr/bin/node')
    await mkdir(dirname(systemNode), { recursive: true })
    await symlink(process.execPath, systemNode)
    const callerBin = join(root, 'caller bin')
    await mkdir(callerBin, { recursive: true })
    await writeFile(join(callerBin, 'node'), '#!/bin/sh\nexit 73\n', {
      mode: 0o755,
    })
    const callerEnvironment = {
      PATH: callerBin,
      NODE_OPTIONS: '--require=/missing-caller-preload.cjs',
    }
    const secretsFile = join(root, WORKSPACE_TOOLS_SECRETS_FILE)
    await mkdir(dirname(secretsFile), { recursive: true })
    await writeFile(
      secretsFile,
      [
        `${TOOL_ENV.machineOrigin}='https://machine.conducting.test'`,
        `${TOOL_ENV.workspaceToken}='fake-image-workspace-token'`,
        `${TOOL_ENV.turnId}='fake-image-turn'`,
        "NODE_OPTIONS='--require=/missing-org-preload.cjs'",
        '',
      ].join('\n'),
      { mode: 0o600 },
    )

    const executable = join(root, WORKSPACE_TOOLS_COMMAND)
    const help = await imageTestProcess(
      executable,
      ['--help'],
      '',
      callerEnvironment,
    )
    expect(help.exitCode, help.stderr).toBe(0)
    expect(help.stderr).toBe('')
    expect(help.stdout).toContain('conducting workspaces list')
    expect(help.stdout).toContain(
      'conducting workspaces create --repository ID --message TEXT',
    )
    expect(help.stdout).toContain('conducting mcp')

    const mcp = await imageTestProcess(
      executable,
      ['mcp'],
      [
        MCP_INITIALIZE,
        MCP_INITIALIZED,
        mcpRequest('tools', 'tools/list'),
        '',
      ].join('\n'),
      callerEnvironment,
    )
    expect(mcp.exitCode, mcp.stderr).toBe(0)
    expect(mcp.stderr).toBe('')
    const lines = mcp.stdout.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(mcpRepliesById(lines)).toMatchObject({
      init: {
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
        },
      },
      tools: {
        result: {
          tools: [
            { name: 'run_mac_command' },
            { name: 'create_workspace' },
            { name: 'list_workspaces' },
          ],
        },
      },
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it('uses executable Node candidates in fixed folder order and never falls back to PATH', async () => {
  const root = await mkdtemp(join(tmpdir(), "conducting node's "))
  try {
    await installWorkspaceTools(
      WORKSPACE_TOOL_SOURCES,
      async (command) => {
        const result = await imageTestProcess('/bin/sh', ['-c', command])
        expect(result.exitCode, result.stderr).toBe(0)
        return result
      },
      root,
    )
    const candidates = [
      { folder: 'usr/local/bin', exitCode: 31 },
      { folder: 'usr/bin', exitCode: 32 },
      { folder: 'bin', exitCode: 33 },
    ]
    for (const candidate of candidates) {
      const folder = join(root, candidate.folder)
      await mkdir(folder, { recursive: true })
      await writeFile(
        join(folder, 'node'),
        `#!/bin/sh\nexit ${candidate.exitCode}\n`,
        { mode: 0o755 },
      )
    }
    const executable = join(root, WORKSPACE_TOOLS_COMMAND)
    for (const candidate of candidates) {
      const result = await imageTestProcess(executable, ['--help'])
      expect(result.exitCode, result.stderr).toBe(candidate.exitCode)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      await chmod(join(root, candidate.folder, 'node'), 0o644)
    }
    const unavailable = await imageTestProcess(executable, ['--help'])
    expect(unavailable.exitCode).toBe(1)
    expect(unavailable.stdout).toBe('')
    expect(unavailable.stderr).toBe(
      'Node is not available for the workspace tools.\n',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

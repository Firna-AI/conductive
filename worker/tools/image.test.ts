import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { expect, it } from 'vitest'

import { TOOL_ENV } from '../../tools/context'
import { MCP_PROTOCOL_VERSION } from '../../tools/mcp'
import { imageNodeExecutable } from '../lifecycle/image-runtime'
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
  const root = await mkdtemp(join(tmpdir(), "conductive image's "))
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
    const privateNode = imageNodeExecutable(root)
    await mkdir(dirname(privateNode), { recursive: true })
    await symlink(process.execPath, privateNode)
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
        `${TOOL_ENV.machineOrigin}='https://machine.conductive.test'`,
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
    expect(help.stdout).toContain('conductive workspaces list')
    expect(help.stdout).toContain(
      'conductive workspaces create --repository ID --message TEXT',
    )
    expect(help.stdout).toContain('conductive mcp')
    expect(help.stdout).toContain('conductive sessions list')
    expect(help.stdout).toContain('conductive sessions read')
    expect(help.stdout).toContain('conductive sessions create')
    expect(help.stdout).toContain('conductive sessions send')

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
            { name: 'list_repositories' },
            { name: 'list_sections' },
            { name: 'list_models' },
            { name: 'list_sessions' },
            { name: 'read_session' },
            { name: 'create_session' },
            { name: 'send_message' },
          ],
        },
      },
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it('requires the private runtime and never falls back to system Node or PATH', async () => {
  const root = await mkdtemp(join(tmpdir(), "conductive node's "))
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
    for (const folderName of ['usr/local/bin', 'usr/bin', 'bin']) {
      const folder = join(root, folderName)
      await mkdir(folder, { recursive: true })
      await writeFile(join(folder, 'node'), '#!/bin/sh\nexit 73\n', {
        mode: 0o755,
      })
    }
    const executable = join(root, WORKSPACE_TOOLS_COMMAND)
    const environment = { PATH: join(root, 'bin') }
    const node = imageNodeExecutable(root)
    for (const installed of [false, true]) {
      if (installed) {
        await mkdir(dirname(node), { recursive: true })
        await writeFile(node, '#!/bin/sh\nexit 41\n', { mode: 0o644 })
      }
      const unavailable = await imageTestProcess(
        executable,
        ['--help'],
        '',
        environment,
      )
      expect(unavailable.exitCode).toBe(1)
      expect(unavailable.stdout).toBe('')
      expect(unavailable.stderr).toBe(
        'Node is not available for the workspace tools.\n',
      )
    }
    await chmod(node, 0o755)
    const available = await imageTestProcess(
      executable,
      ['--help'],
      '',
      environment,
    )
    expect(available.exitCode, available.stderr).toBe(41)
    expect(available.stdout).toBe('')
    expect(available.stderr).toBe('')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { TOOL_ENV } from '../../tools/context'
import { loadWorkspaceToolSources } from '../../tools/image-assets'
import { MCP_PROTOCOL_VERSION } from '../../tools/mcp'
import {
  installWorkspaceTools,
  WORKSPACE_TOOLS_COMMAND,
  WORKSPACE_TOOLS_SECRETS_FILE,
} from './image'
import { imageTestProcess } from './image-test-process'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpRepliesById,
  mcpRequest,
} from './mcp-test-support'

it('reports failed or incomplete image installation instead of accepting it', async () => {
  const sources = await loadWorkspaceToolSources()
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
      await loadWorkspaceToolSources(),
      async (command) => {
        const result = await imageTestProcess('/bin/sh', ['-c', command])
        expect(result.exitCode, result.stderr).toBe(0)
        return result
      },
      root,
    )
    const secretsFile = join(root, WORKSPACE_TOOLS_SECRETS_FILE)
    await mkdir(dirname(secretsFile), { recursive: true })
    await writeFile(
      secretsFile,
      [
        `${TOOL_ENV.machineOrigin}='https://machine.conducting.test'`,
        `${TOOL_ENV.workspaceToken}='fake-image-workspace-token'`,
        `${TOOL_ENV.turnId}='fake-image-turn'`,
        '',
      ].join('\n'),
      { mode: 0o600 },
    )

    const executable = join(root, WORKSPACE_TOOLS_COMMAND)
    const help = await imageTestProcess(executable, ['--help'])
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
          tools: [{ name: 'create_workspace' }, { name: 'list_workspaces' }],
        },
      },
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { createCodexFactory } from './codex'
import * as computer from './computer-mcp'

beforeEach(mockComputerServer)

function mcpArguments(args: readonly string[]): string[] {
  return args.flatMap((value, index) => {
    const setting = args[index + 1]
    return value === '-c' && setting?.startsWith('mcp_servers.')
      ? [value, setting]
      : []
  })
}

it('passes each stdio server environment to Codex as a TOML table', async () => {
  vi.spyOn(computer, 'readComputerServer').mockResolvedValue({
    command: '/usr/local/bin/cua-driver',
    args: ['mcp'],
    env: {
      DISPLAY: ':0',
      DBUS_SESSION_BUS_ADDRESS: 'unix:path=/run/conductive-e2b-desktop/bus',
      XDG_RUNTIME_DIR: '/run/conductive-e2b-desktop',
    },
    timeout: 30,
    alwaysLoad: true,
  })
  const h = await providerFixture('codex')
  const servers = new FakeAppServers()
  const provider = await createCodexFactory(servers.start)(h.options)
  onTestFinished(() => provider.close())

  expect(mcpArguments(servers.requests[0].args)).toEqual([
    '-c',
    'mcp_servers.conductive.command="/usr/local/bin/conductive"',
    '-c',
    'mcp_servers.conductive.args=["mcp"]',
    '-c',
    'mcp_servers.conductive.env_vars=["CONDUCTIVE_MACHINE_ORIGIN","CONDUCTIVE_WORKSPACE_TOKEN","CONDUCTIVE_TURN_ID"]',
    '-c',
    'mcp_servers.computer.command="/usr/local/bin/cua-driver"',
    '-c',
    'mcp_servers.computer.args=["mcp"]',
    '-c',
    'mcp_servers.computer.env={"DISPLAY"=":0","DBUS_SESSION_BUS_ADDRESS"="unix:path=/run/conductive-e2b-desktop/bus","XDG_RUNTIME_DIR"="/run/conductive-e2b-desktop"}',
  ])
})

it('passes the E2B launcher arguments to Codex without an env setting', async () => {
  vi.spyOn(computer, 'readComputerServer').mockResolvedValue({
    type: 'stdio',
    command: '/usr/bin/env',
    args: [
      'DISPLAY=:0',
      'DBUS_SESSION_BUS_ADDRESS=unix:path=/run/conductive-e2b-desktop/bus',
      'XDG_RUNTIME_DIR=/run/conductive-e2b-desktop',
      '/usr/local/bin/cua-driver',
      'mcp',
    ],
  })
  const h = await providerFixture('codex')
  const servers = new FakeAppServers()
  const provider = await createCodexFactory(servers.start)(h.options)
  onTestFinished(() => provider.close())

  expect(mcpArguments(servers.requests[0].args)).toEqual([
    '-c',
    'mcp_servers.conductive.command="/usr/local/bin/conductive"',
    '-c',
    'mcp_servers.conductive.args=["mcp"]',
    '-c',
    'mcp_servers.conductive.env_vars=["CONDUCTIVE_MACHINE_ORIGIN","CONDUCTIVE_WORKSPACE_TOKEN","CONDUCTIVE_TURN_ID"]',
    '-c',
    'mcp_servers.computer.command="/usr/bin/env"',
    '-c',
    'mcp_servers.computer.args=["DISPLAY=:0","DBUS_SESSION_BUS_ADDRESS=unix:path=/run/conductive-e2b-desktop/bus","XDG_RUNTIME_DIR=/run/conductive-e2b-desktop","/usr/local/bin/cua-driver","mcp"]',
  ])
})

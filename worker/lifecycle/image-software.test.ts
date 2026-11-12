import process from 'node:process'

import { expect, it } from 'vitest'

import { imageSoftwareFixture } from './image-software-test-support'

it('installs the runner and relay and starts both with the private runtime', async () => {
  const fixture = await imageSoftwareFixture()
  const installed = await fixture.install()
  expect(installed.exitCode, installed.stderr).toBe(0)
  expect(await fixture.calls()).toEqual([
    'private Node',
    'apt-get update',
    'apt-get install -y gh',
    `git config --system --replace-all credential.helper ${fixture.credentialHelper}`,
    'git config --system credential.useHttpPath true',
    'systemctl daemon-reload',
    'systemctl enable conductive-runner.service',
    'systemctl enable conductive-preview-relay.socket',
    'systemctl enable conductive-preview-relay.service',
  ])
  expect(await fixture.relayService()).toContain(
    'ExecStart=/opt/conductive/preview-relay-start.sh',
  )
  expect(await fixture.relayService()).toContain(
    'Requires=conductive-preview-relay.socket',
  )
  expect(await fixture.relayService()).toContain(
    'After=network-online.target conductive-preview-relay.socket',
  )
  expect(await fixture.relaySocket()).toBe(
    '[Unit]\nDescription=Conductive preview relay socket\n\n' +
      '[Socket]\nListenStream=127.0.0.1:7682\n\n' +
      '[Install]\nWantedBy=sockets.target\n',
  )
  // The disk rule takes effect at the next boot. Installation runs no udev command.
  expect(
    (await fixture.diskCacheRule())
      .split('\n')
      .filter((line) => line && !line.startsWith('#')),
  ).toEqual([
    'ACTION=="add|change", SUBSYSTEM=="block", ENV{DEVTYPE}=="disk", KERNEL=="vd*", ATTR{queue/write_cache}="write through"',
  ])
  const relay = await fixture.relayStart()
  expect(relay.exitCode, relay.stderr).toBe(0)
  expect(JSON.parse(relay.stdout)).toEqual({
    node: process.execPath,
    relay: true,
  })
  const github = await fixture.githubCli(['--version'])
  expect(github.exitCode, github.stderr).toBe(0)
  expect(github.stdout).toBe('gh-ready\n')
  const started = await fixture.start({
    WORKSPACE_TOKEN: 'workspace-token',
    CONDUCTIVE_WORKSPACE_ID: 'workspace-one',
    CONDUCTIVE_NODE: `${fixture.commands}/node`,
  })
  expect(started.exitCode, started.stderr).toBe(0)
  expect(JSON.parse(started.stdout)).toEqual({
    node: process.execPath,
    cwd: fixture.repository,
    workspace: 'workspace-one',
    configuredNode: `${fixture.commands}/node`,
  })
  expect((await fixture.calls()).at(-1)).toBe('private Node')
})

it('rejects an archive without the relay before it replaces installed software', async () => {
  const fixture = await imageSoftwareFixture({ relay: false })
  const installed = await fixture.install()
  expect(installed.exitCode).toBe(1)
  expect(await fixture.calls()).toEqual([])
})

it('keeps the image runner stopped before workspace startup and during disk retention', async () => {
  const fixture = await imageSoftwareFixture()
  const installed = await fixture.install()
  expect(installed.exitCode, installed.stderr).toBe(0)
  const workspace = {
    WORKSPACE_TOKEN: 'workspace-token',
    CONDUCTIVE_WORKSPACE_ID: 'workspace-one',
  }
  const stoppedCases: Readonly<Record<string, string>>[] = [
    {},
    { WORKSPACE_TOKEN: 'workspace-token' },
    { ...workspace, CONDUCTIVE_DISK_KEEPALIVE: '1' },
  ]
  for (const values of stoppedCases) {
    const stopped = await fixture.start(values)
    expect(stopped.exitCode, stopped.stderr).toBe(0)
    expect(stopped.stdout).toBe('')
  }
  const notReady = await fixture.start(workspace, false)
  expect(notReady.exitCode, notReady.stderr).toBe(0)
  expect(notReady.stdout).toBe('')
  expect(
    (await fixture.calls()).filter((call) => call === 'private Node'),
  ).toEqual(['private Node'])
})

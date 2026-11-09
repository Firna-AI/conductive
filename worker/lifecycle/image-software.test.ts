import process from 'node:process'

import { expect, it } from 'vitest'

import { imageSoftwareFixture } from './image-software-test-support'

it('installs a runner-only artifact and starts it with the private runtime after sandbox env loading', async () => {
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
  ])
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

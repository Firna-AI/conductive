import { expect, it } from 'vitest'

import { runtimeNodeFixture } from '../test-support/runtime-node'

it('uses the private Node for npm and the service after sandbox env loading', async () => {
  const fixture = await runtimeNodeFixture()
  expect(await fixture.install(fixture.node)).toEqual({
    code: 0,
    stdout: '',
    stderr: '',
  })
  expect(await fixture.calls()).toEqual([
    'private Node',
    JSON.stringify([
      'ci',
      '--omit=dev',
      '--ignore-scripts',
      '--prefix',
      fixture.prefix,
    ]),
    'systemctl daemon-reload',
    'systemctl enable conducting-runner.service',
  ])
  const invocation = (await fixture.unit())
    .split('\n')
    .find((line) => line.startsWith('ExecStart='))
    ?.slice('ExecStart='.length)
  expect(invocation).toBe(
    `"${fixture.prefix}/service/start.sh" "${fixture.node}"`,
  )
  const started = await fixture.start(invocation ?? '')
  expect(started.code).toBe(0)
  expect(started.stderr).toBe('')
  const output: unknown = JSON.parse(started.stdout)
  expect(output).toEqual({
    node: process.execPath,
    marker: 'loaded',
    envNode: `${fixture.commands}/node`,
    path: `${fixture.commands}:/usr/bin:/bin`,
  })
  expect((await fixture.calls()).at(-1)).toBe('private Node')
})

it('requires an absolute Node setting before installing the service', async () => {
  const fixture = await runtimeNodeFixture()
  for (const setting of [undefined, '', 'node']) {
    const installed = await fixture.install(setting)
    expect(installed.code, JSON.stringify(setting)).toBe(1)
    expect(installed.stderr).toContain(
      'Set CONDUCTING_NODE to an absolute Node executable path.',
    )
    expect(await fixture.calls()).toEqual([])
  }
})
